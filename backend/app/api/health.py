import os
from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings
from app.rag.vector_store import VectorStoreManager

router = APIRouter(tags=["Health"])
vector_store = VectorStoreManager()

@router.get("/health")
async def health_check():
    gemini_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    chroma_status = vector_store.get_stats()

    return {
        "status": "healthy",
        "app_name": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": "sqlite_connected",
            "vector_store": chroma_status.get("status", "connected"),
            "llm_engine": "gemini_live" if gemini_key else "development_synthesis_mode"
        }
    }
