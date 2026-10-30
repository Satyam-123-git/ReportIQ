import pytest
from app.rag.vector_store import VectorStoreManager
from app.services.pdf_processor import ProcessedChunk
from app.services.numerical_engine import NumericalEngine
from app.rag.rag_pipeline import RAGPipeline
from app.schemas.chat import AskQuestionRequest

@pytest.fixture
def populated_vector_store():
    store = VectorStoreManager()
    chunks = [
        ProcessedChunk(
            chunk_id="chk_p1_1",
            document_id="doc_demo_1",
            document_name="National Demographic Survey.pdf",
            page_number=1,
            content="According to the survey enumeration, the total population recorded in the report was 1,380,004,385. The percentage of rural population stands at 68.84%.",
            content_type="text",
            section_title="Demographics"
        ),
        ProcessedChunk(
            chunk_id="chk_p2_1",
            document_id="doc_demo_1",
            document_name="National Demographic Survey.pdf",
            page_number=2,
            content="Table 2: State Literacy Rates. Kerala recorded the highest literacy rate at 94.00%. Bihar recorded 61.80%.",
            content_type="table",
            section_title="Education"
        )
    ]
    store.add_chunks(chunks)
    return store

@pytest.mark.asyncio
async def test_grounded_answer_and_page_citations(populated_vector_store):
    pipeline = RAGPipeline(
        vector_store=populated_vector_store,
        numerical_engine=NumericalEngine()
    )

    req = AskQuestionRequest(
        question="What was the total population recorded in the report?",
        document_id="doc_demo_1"
    )

    response = await pipeline.answer_question(req)

    assert response is not None
    assert "1,380,004,385" in response.answer or "population" in response.answer.lower()
    assert len(response.citations) > 0
    # Verified source citation
    assert response.citations[0].page_number in [1, 2]
    assert response.citations[0].document_name == "National Demographic Survey.pdf"

@pytest.mark.asyncio
async def test_missing_information_strict_grounding(populated_vector_store):
    pipeline = RAGPipeline(
        vector_store=populated_vector_store,
        numerical_engine=NumericalEngine()
    )

    # Question about something completely absent
    req = AskQuestionRequest(
        question="What is the average rainfall in the Amazon rainforest in 1985?",
        document_id="doc_demo_1"
    )

    response = await pipeline.answer_question(req)

    # Must refuse or return not found
    assert "Not found in the uploaded report" in response.answer or "not contain" in response.answer.lower()
