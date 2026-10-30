import json
import uuid
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from app.database.session import get_db
from app.models.chat import Conversation, Message
from app.models.document import Document, ExtractedTable
from app.schemas.chat import (
    AskQuestionRequest,
    AskQuestionResponse,
    ConversationResponse,
    MessageResponse,
    Citation,
    ChartData,
    CalculationDetail,
)
from app.rag.rag_pipeline import RAGPipeline
from app.rag.vector_store import VectorStoreManager
from app.services.numerical_engine import NumericalEngine

router = APIRouter(prefix="/chat", tags=["Chat"])
logger = logging.getLogger("reportiq.api.chat")

vector_store = VectorStoreManager()
numerical_engine = NumericalEngine()
rag_pipeline = RAGPipeline(vector_store=vector_store, numerical_engine=numerical_engine)

@router.post("/ask", response_model=AskQuestionResponse)
async def ask_question(request: AskQuestionRequest, db: AsyncSession = Depends(get_db)):
    if not request.question or not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    # 1. Resolve or create conversation
    conv_id = request.conversation_id
    conversation = None
    if conv_id:
        conversation = await db.get(Conversation, conv_id)

    if not conversation:
        title = request.question[:45] + ("..." if len(request.question) > 45 else "")
        conversation = Conversation(
            id=str(uuid.uuid4()) if not conv_id else conv_id,
            title=title,
            document_id=request.document_id,
            created_at=datetime.utcnow()
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)

    # 2. Fetch available tables if document_id is provided, for numerical intelligence
    tables_data = []
    t_query = select(ExtractedTable)
    if request.document_id:
        t_query = t_query.where(ExtractedTable.document_id == request.document_id)
    t_res = await db.execute(t_query)
    db_tables = t_res.scalars().all()

    # Pre-fetch document name
    doc_name = "Government Statistical Report"
    if request.document_id:
        d = await db.get(Document, request.document_id)
        if d:
            doc_name = d.original_filename

    for tbl in db_tables:
        try:
            tables_data.append({
                "id": tbl.id,
                "document_id": tbl.document_id,
                "document_name": doc_name,
                "page_number": tbl.page_number,
                "table_title": tbl.table_title,
                "headers": json.loads(tbl.headers_json),
                "rows": json.loads(tbl.rows_json),
                "raw_text": tbl.raw_text
            })
        except Exception:
            pass

    # 3. Execute RAG Answer Pipeline
    response = await rag_pipeline.answer_question(request, db_tables=tables_data)
    response.conversation_id = conversation.id

    # 4. Save User Message
    user_msg = Message(
        conversation_id=conversation.id,
        role="user",
        question=request.question,
        answer="",
        created_at=datetime.utcnow()
    )
    db.add(user_msg)

    # 5. Save Assistant Message with full evidence & citation metadata
    assistant_msg = Message(
        id=response.message_id,
        conversation_id=conversation.id,
        role="assistant",
        question=request.question,
        answer=response.answer,
        citations_json=json.dumps([c.model_dump() for c in response.citations]),
        chart_data_json=json.dumps(response.chart_data.model_dump()) if response.chart_data else None,
        calculation_details_json=json.dumps(response.calculation_details.model_dump()) if response.calculation_details else None,
        confidence_score=response.confidence_score,
        created_at=response.created_at
    )
    db.add(assistant_msg)

    conversation.updated_at = datetime.utcnow()
    await db.commit()

    return response

@router.get("/history", response_model=List[ConversationResponse])
async def get_chat_history(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .order_by(Conversation.updated_at.desc())
    )
    convs = result.scalars().all()

    response_list = []
    for c in convs:
        formatted_messages = []
        for m in c.messages:
            citations = []
            if m.citations_json:
                try:
                    citations = [Citation(**item) for item in json.loads(m.citations_json)]
                except Exception:
                    pass

            chart_data = None
            if m.chart_data_json:
                try:
                    chart_data = ChartData(**json.loads(m.chart_data_json))
                except Exception:
                    pass

            calc_details = None
            if m.calculation_details_json:
                try:
                    calc_details = CalculationDetail(**json.loads(m.calculation_details_json))
                except Exception:
                    pass

            formatted_messages.append(MessageResponse(
                id=m.id,
                conversation_id=m.conversation_id,
                role=m.role,
                question=m.question,
                answer=m.answer,
                citations=citations,
                chart_data=chart_data,
                calculation_details=calc_details,
                confidence_score=m.confidence_score,
                created_at=m.created_at
            ))

        response_list.append(ConversationResponse(
            id=c.id,
            title=c.title,
            document_id=c.document_id,
            created_at=c.created_at,
            updated_at=c.updated_at,
            message_count=len(c.messages),
            messages=formatted_messages
        ))

    return response_list

@router.get("/history/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id)
    )
    c = result.scalar_one_or_none()
    if not c:
        raise HTTPException(status_code=404, detail="Conversation not found")

    formatted_messages = []
    for m in c.messages:
        citations = []
        if m.citations_json:
            try:
                citations = [Citation(**item) for item in json.loads(m.citations_json)]
            except Exception:
                pass

        chart_data = None
        if m.chart_data_json:
            try:
                chart_data = ChartData(**json.loads(m.chart_data_json))
            except Exception:
                pass

        calc_details = None
        if m.calculation_details_json:
            try:
                calc_details = CalculationDetail(**json.loads(m.calculation_details_json))
            except Exception:
                pass

        formatted_messages.append(MessageResponse(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            question=m.question,
            answer=m.answer,
            citations=citations,
            chart_data=chart_data,
            calculation_details=calc_details,
            confidence_score=m.confidence_score,
            created_at=m.created_at
        ))

    return ConversationResponse(
        id=c.id,
        title=c.title,
        document_id=c.document_id,
        created_at=c.created_at,
        updated_at=c.updated_at,
        message_count=len(c.messages),
        messages=formatted_messages
    )

@router.delete("/history/{conversation_id}")
async def delete_conversation(conversation_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Conversation).where(Conversation.id == conversation_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    await db.delete(conv)
    await db.commit()
    return {"success": True, "message": "Conversation deleted."}
