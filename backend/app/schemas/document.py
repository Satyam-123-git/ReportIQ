from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class ExtractedTableResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    table_index: int
    table_title: Optional[str] = "Table"
    headers: List[str] = []
    rows: List[List[Any]] = []
    raw_text: str = ""
    row_count: int = 0
    col_count: int = 0

class DocumentPageResponse(BaseModel):
    id: str
    document_id: str
    page_number: int
    extracted_text: str
    word_count: int
    has_tables: bool
    tables: List[ExtractedTableResponse] = []

class DocumentSummary(BaseModel):
    id: str
    filename: str
    original_filename: str
    file_size: int
    total_pages: int
    processing_status: str
    status_message: Optional[str] = None
    total_tables: int
    uploaded_at: datetime
    processed_at: Optional[datetime] = None

class DocumentDetailResponse(DocumentSummary):
    pages: List[DocumentPageResponse] = []
    tables: List[ExtractedTableResponse] = []

class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    status: str
    message: str
