from typing import List, Optional, Dict, Any
from pydantic import BaseModel

class SystemStatusInfo(BaseModel):
    status: str = "operational"
    gemini_api_configured: bool
    chromadb_status: str
    active_model: str
    embedding_model: str
    storage_used_bytes: int

class RecentQuestionItem(BaseModel):
    id: str
    conversation_id: str
    question: str
    created_at: str
    citations_count: int

class AnalyticsOverviewResponse(BaseModel):
    total_documents: int
    total_pages_indexed: int
    total_tables_extracted: int
    total_questions_asked: int
    total_conversations: int
    system_status: SystemStatusInfo
    categories_breakdown: Dict[str, int] = {}
