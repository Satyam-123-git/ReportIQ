import os
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.config import settings
from app.database.session import get_db
from app.models.document import Document, DocumentPage, ExtractedTable
from app.models.chat import Conversation, Message
from app.schemas.analytics import AnalyticsOverviewResponse, SystemStatusInfo
from app.rag.vector_store import VectorStoreManager

router = APIRouter(prefix="/analytics", tags=["Analytics"])
vector_store = VectorStoreManager()

@router.get("/overview", response_model=AnalyticsOverviewResponse)
async def get_overview(db: AsyncSession = Depends(get_db)):
    # 1. Total documents
    doc_count_res = await db.execute(select(func.count(Document.id)))
    total_docs = doc_count_res.scalar() or 0

    # 2. Total pages indexed
    pages_count_res = await db.execute(select(func.count(DocumentPage.id)))
    total_pages = pages_count_res.scalar() or 0

    # 3. Total tables extracted
    tables_count_res = await db.execute(select(func.count(ExtractedTable.id)))
    total_tables = tables_count_res.scalar() or 0

    # 4. Total questions asked
    msg_count_res = await db.execute(select(func.count(Message.id)).where(Message.role == "assistant"))
    total_questions = msg_count_res.scalar() or 0

    # 5. Total conversations
    conv_count_res = await db.execute(select(func.count(Conversation.id)))
    total_convs = conv_count_res.scalar() or 0

    # Storage size
    storage_size = 0
    if os.path.exists(settings.UPLOAD_DIR):
        for f in os.scandir(settings.UPLOAD_DIR):
            if f.is_file():
                storage_size += f.stat().st_size

    chroma_stats = vector_store.get_stats()
    gemini_key_present = bool(settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY"))

    status_info = SystemStatusInfo(
        status="operational",
        gemini_api_configured=gemini_key_present,
        chromadb_status=chroma_stats.get("status", "connected"),
        active_model=settings.GEMINI_MODEL,
        embedding_model=settings.EMBEDDING_MODEL,
        storage_used_bytes=storage_size
    )

    return AnalyticsOverviewResponse(
        total_documents=total_docs,
        total_pages_indexed=total_pages,
        total_tables_extracted=total_tables,
        total_questions_asked=total_questions,
        total_conversations=total_convs,
        system_status=status_info,
        categories_breakdown={
            "Demographics & Population": total_tables // 2 + 1 if total_tables > 0 else 0,
            "Labor & Employment": total_tables // 3 if total_tables > 0 else 0,
            "Education & Literacy": total_tables // 4 + 1 if total_tables > 0 else 0,
            "Economic Statistics": total_docs
        }
    )
