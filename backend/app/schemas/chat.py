from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class Citation(BaseModel):
    document_id: str
    document_name: str
    page_number: int
    evidence: str
    source_type: str = "Text"  # "Text" or "Table"
    table_title: Optional[str] = None
    relevance_score: float = 1.0
    bounding_box: Optional[Dict[str, float]] = None

class ChartData(BaseModel):
    chart_type: str = "bar"  # bar, line, pie, comparison, ranking
    title: str
    description: Optional[str] = None
    x_key: str = "label"
    y_keys: List[str] = ["value"]
    data: List[Dict[str, Any]] = []
    source_page: Optional[int] = None
    source_document: Optional[str] = None

class CalculationDetail(BaseModel):
    method: str
    formula: Optional[str] = None
    inputs: Optional[Dict[str, Any]] = None
    result: Optional[Any] = None

class AskQuestionRequest(BaseModel):
    question: str = Field(..., min_length=1, description="The user's question about the report")
    document_id: Optional[str] = Field(None, description="Target document ID, or None for all documents")
    document_ids: Optional[List[str]] = Field(None, description="Optional list of specific document IDs")
    conversation_id: Optional[str] = Field(None, description="Optional existing conversation ID to continue")

class AskQuestionResponse(BaseModel):
    conversation_id: str
    message_id: str
    question: str
    answer: str
    citations: List[Citation] = []
    chart_data: Optional[ChartData] = None
    calculation_details: Optional[CalculationDetail] = None
    confidence_score: float = 1.0
    is_calculated: bool = False
    calculation_method: Optional[str] = None
    created_at: datetime

class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    question: Optional[str] = None
    answer: str
    citations: List[Citation] = []
    chart_data: Optional[ChartData] = None
    calculation_details: Optional[CalculationDetail] = None
    confidence_score: Optional[float] = None
    created_at: datetime

class ConversationResponse(BaseModel):
    id: str
    title: str
    document_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    message_count: int = 0
    messages: List[MessageResponse] = []
