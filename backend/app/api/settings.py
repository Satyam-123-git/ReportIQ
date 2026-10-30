import os
from pydantic import BaseModel
from typing import Optional
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])

class SettingsUpdateRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    retrieval_threshold: Optional[float] = None
    model_name: Optional[str] = None

@router.get("/config")
async def get_config():
    current_key = settings.GEMINI_API_KEY or os.environ.get("GEMINI_API_KEY")
    masked_key = ""
    if current_key:
        masked_key = current_key[:4] + "..." + current_key[-4:] if len(current_key) > 8 else "***"

    return {
        "gemini_api_configured": bool(current_key),
        "masked_api_key": masked_key,
        "active_model": settings.GEMINI_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "retrieval_threshold": settings.RETRIEVAL_CONFIDENCE_THRESHOLD,
        "chunk_size": settings.CHUNK_SIZE,
        "chunk_overlap": settings.CHUNK_OVERLAP,
    }

@router.post("/config")
async def update_config(payload: SettingsUpdateRequest):
    if payload.gemini_api_key is not None:
        key = payload.gemini_api_key.strip()
        settings.GEMINI_API_KEY = key if key else None
        if key:
            os.environ["GEMINI_API_KEY"] = key
        else:
            os.environ.pop("GEMINI_API_KEY", None)

    if payload.retrieval_threshold is not None:
        settings.RETRIEVAL_CONFIDENCE_THRESHOLD = max(0.05, min(0.95, payload.retrieval_threshold))

    if payload.model_name is not None and payload.model_name.strip():
        settings.GEMINI_MODEL = payload.model_name.strip()

    return {
        "success": True,
        "message": "Settings updated successfully.",
        "gemini_api_configured": bool(settings.GEMINI_API_KEY),
        "active_model": settings.GEMINI_MODEL
    }
