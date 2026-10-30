from typing import List, Optional
from pydantic import BaseModel, Field

class SearchRequest(BaseModel):
    query: str = Field(..., min_length=1)
    document_id: Optional[str] = None
    mode: str = "hybrid"  # hybrid, semantic, keyword
    limit: int = 10

class SearchResultItem(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    content: str
    content_type: str = "text"  # text or table
    score: float
    table_title: Optional[str] = None

class SearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[SearchResultItem]
