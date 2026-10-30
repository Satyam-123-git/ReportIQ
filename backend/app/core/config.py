import os
from pathlib import Path
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = BASE_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
CHROMA_DIR = STORAGE_DIR / "chroma"

class Settings(BaseSettings):
    PROJECT_NAME: str = "ReportIQ – AI Government Statistics Navigator"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # Paths
    BASE_DIR: Path = BASE_DIR
    STORAGE_DIR: Path = STORAGE_DIR
    UPLOAD_DIR: Path = UPLOAD_DIR
    CHROMA_DIR: Path = CHROMA_DIR
    
    # Database
    DATABASE_URL: str = f"sqlite+aiosqlite:///{STORAGE_DIR}/reportiq.db"
    
    # AI & RAG Configuration
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.8-flash"
    FALLBACK_MODEL: str = "gemini-3.5-flash-lite"
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"
    
    # Retrieval Tuning
    RETRIEVAL_CONFIDENCE_THRESHOLD: float = 0.30
    TOP_K_CHUNKS: int = 6
    CHUNK_SIZE: int = 600
    CHUNK_OVERLAP: int = 100
    
    # Upload limits
    MAX_UPLOAD_SIZE_MB: int = 60
    ALLOWED_EXTENSIONS: List[str] = [".pdf"]
    
    # CORS
    CORS_ORIGINS: List[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.CHROMA_DIR.mkdir(parents=True, exist_ok=True)
