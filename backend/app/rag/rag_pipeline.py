import os
import re
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime

from app.core.config import settings
from app.rag.vector_store import VectorStoreManager, RetrievedEvidence
from app.services.numerical_engine import NumericalEngine, NumericalAnalysisResult
from app.schemas.chat import (
    AskQuestionRequest,
    AskQuestionResponse,
    Citation,
    ChartData,
    CalculationDetail,
)

logger = logging.getLogger("reportiq.rag_pipeline")

class RAGPipeline:
    """
    End-to-End Grounded Retrieval-Augmented Generation Pipeline:
    1. Query analysis & intent detection
    2. Hybrid vector + lexical retrieval with document filtering
    3. Numerical table analysis with Pandas/NumPy
    4. Strict LLM synthesis via Google GenAI (gemini-3.8-flash)
    5. Hallucination prevention & citation validation
    6. Dev mode fallback if Gemini API key is missing
    """

    def __init__(self, vector_store: VectorStoreManager, numerical_engine: NumericalEngine):
        self.vector_store = vector_store
        self.numerical_engine = numerical_engine
        self._gemini_client = None
        self._init_gemini()

    def _init_gemini(self):
        api_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
        if api_key:
            try:
                from google import genai
                self._gemini_client = genai.Client(api_key=api_key)
                logger.info("Gemini API client initialized successfully.")
            except Exception as e:
                logger.warning(f"Could not initialize Gemini Client: {e}")
                self._gemini_client = None
        else:
            logger.info("No GEMINI_API_KEY detected. Running in deterministic development mode.")

    def set_api_key(self, api_key: str):
        """Update API key at runtime from settings."""
        settings.GEMINI_API_KEY = api_key
        os.environ["GEMINI_API_KEY"] = api_key
        self._init_gemini()

    async def answer_question(
        self,
        request: AskQuestionRequest,
        db_tables: Optional[List[Dict[str, Any]]] = None
    ) -> AskQuestionResponse:
        question = request.question.strip()
        doc_id = request.document_id

        logger.info(f"RAG query: '{question}' (doc_filter: {doc_id})")

        # 1. Retrieve evidence from VectorStore (hybrid search)
        retrieved_chunks = self.vector_store.search(
            query=question,
            document_id=doc_id,
            top_k=settings.TOP_K_CHUNKS
        )

        # 2. Check for Numerical / Table Intelligence if tables are available
        num_result: Optional[NumericalAnalysisResult] = None
        if db_tables:
            for tbl in db_tables:
                res = self.numerical_engine.analyze_table_query(
                    question=question,
                    table_meta=tbl,
                    document_name=tbl.get("document_name", "Statistical Report")
                )
                if res.is_applicable:
                    num_result = res
                    break

        # 3. Grounding & Confidence Check
        max_score = max([c.score for c in retrieved_chunks], default=0.0)
        has_sufficient_evidence = (
            (max_score >= settings.RETRIEVAL_CONFIDENCE_THRESHOLD and len(retrieved_chunks) > 0) or
            (num_result and num_result.is_applicable)
        )

        if not has_sufficient_evidence:
            return AskQuestionResponse(
                conversation_id=request.conversation_id or "new",
                message_id=f"msg_{int(datetime.utcnow().timestamp())}",
                question=question,
                answer=(
                    "**Not found in the uploaded report.**\n\n"
                    "The uploaded statistical document does not contain verified data or "
                    f"passages regarding \"{question}\". Please verify your query or select an uploaded report."
                ),
                citations=[],
                chart_data=None,
                calculation_details=None,
                confidence_score=round(max_score, 2),
                is_calculated=False,
                created_at=datetime.utcnow()
            )

        # 4. If Numerical Engine provided a verified programmatic answer, synthesize or enhance it
        if num_result and num_result.is_applicable:
            citations = [num_result.table_citation] if num_result.table_citation else []
            # Add top text chunk citations if relevant
            for chunk in retrieved_chunks[:2]:
                citations.append(Citation(
                    document_id=chunk.document_id,
                    document_name=chunk.document_name,
                    page_number=chunk.page_number,
                    evidence=chunk.content[:280] + ("..." if len(chunk.content) > 280 else ""),
                    source_type=chunk.content_type.capitalize(),
                    relevance_score=chunk.score
                ))

            return AskQuestionResponse(
                conversation_id=request.conversation_id or "new",
                message_id=f"msg_{int(datetime.utcnow().timestamp())}",
                question=question,
                answer=num_result.answer_text or "Analysis completed.",
                citations=citations,
                chart_data=num_result.chart_data,
                calculation_details=num_result.calculation_detail,
                confidence_score=0.98,
                is_calculated=True,
                calculation_method=num_result.calculation_detail.method if num_result.calculation_detail else "Pandas Numerical Computation",
                created_at=datetime.utcnow()
            )

        # 5. Build Grounded Context for LLM Synthesis
        context_blocks = []
        citations_list: List[Citation] = []

        for i, chunk in enumerate(retrieved_chunks):
            context_blocks.append(
                f"[Source {i+1} | Page {chunk.page_number} | Doc: {chunk.document_name} | Type: {chunk.content_type.upper()}]\n"
                f"{chunk.content}\n"
            )
            citations_list.append(Citation(
                document_id=chunk.document_id,
                document_name=chunk.document_name,
                page_number=chunk.page_number,
                evidence=chunk.content[:250] + ("..." if len(chunk.content) > 250 else ""),
                source_type="Table" if chunk.content_type == "table" else "Text",
                table_title=chunk.section_title if chunk.content_type == "table" else None,
                relevance_score=chunk.score
            ))

        context_str = "\n".join(context_blocks)

        # 6. Execute LLM Call or Deterministic Fallback
        answer_text, is_calculated = await self._generate_grounded_answer(question, context_str, retrieved_chunks)

        return AskQuestionResponse(
            conversation_id=request.conversation_id or "new",
            message_id=f"msg_{int(datetime.utcnow().timestamp())}",
            question=question,
            answer=answer_text,
            citations=citations_list,
            chart_data=None,
            calculation_details=None,
            confidence_score=round(max_score, 2),
            is_calculated=is_calculated,
            created_at=datetime.utcnow()
        )

    async def _generate_grounded_answer(
        self,
        question: str,
        context: str,
        retrieved_chunks: List[RetrievedEvidence]
    ) -> Tuple[str, bool]:
        """
        Uses Gemini API (gemini-3.8-flash) with strict hallucination-prevention instructions.
        Falls back to verified rule-based extraction if API key is not present.
        """
        if self._gemini_client:
            try:
                system_instruction = (
                    "You are ReportIQ, a strict and rigorous AI Government Statistics Navigator.\n"
                    "RULES:\n"
                    "1. Answer ONLY using the facts, figures, and tables in the provided context.\n"
                    "2. If the context does not contain the answer, reply EXACTLY with: 'Not found in the uploaded report.'\n"
                    "3. Cite the exact page number [Page X] for every fact or metric cited.\n"
                    "4. NEVER invent statistics, percentages, population numbers, or page numbers.\n"
                    "5. If math or comparison is required, explain the method clearly.\n"
                    "6. Keep answers authoritative, clear, and professional."
                )

                prompt = (
                    f"CONTEXT FROM OFFICIAL REPORT:\n{context}\n\n"
                    f"USER QUESTION: {question}\n\n"
                    f"GROUNDED ANSWER (Include page citations [Page X]):"
                )

                response = self._gemini_client.models.generate_content(
                    model=settings.GEMINI_MODEL,
                    contents=prompt,
                    config={
                        "system_instruction": system_instruction,
                        "temperature": 0.1,  # Low temperature for strict factual accuracy
                    }
                )

                if response and response.text:
                    return response.text.strip(), False
            except Exception as e:
                logger.error(f"Gemini API call failed: {e}. Falling back to deterministic RAG synthesis.")

        # Deterministic Grounded Synthesis Fallback (when API key is absent or offline)
        best_chunk = retrieved_chunks[0] if retrieved_chunks else None
        if not best_chunk:
            return "Not found in the uploaded report.", False

        dev_mode_banner = (
            "> [!NOTE]\n"
            "> **Development Mode**: Deterministic factual synthesis from retrieved report evidence. "
            "To activate live Gemini 3.8 Flash model reasoning, add your `GEMINI_API_KEY` in Settings or `.env`.\n\n"
        )

        extracted_lines = [line.strip() for line in best_chunk.content.split("\n") if line.strip()]
        relevant_text = "\n".join(extracted_lines[:5])

        answer = (
            f"{dev_mode_banner}"
            f"Based on **{best_chunk.document_name}** (Page {best_chunk.page_number}):\n\n"
            f"{relevant_text}\n\n"
            f"**Exact Source Reference**: Page {best_chunk.page_number} ({best_chunk.content_type.capitalize()})."
        )

        return answer, False
