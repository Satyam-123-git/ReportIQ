import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    filename = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=False)
    file_size = Column(Integer, default=0)
    total_pages = Column(Integer, default=0)
    processing_status = Column(String(50), default="pending")  # pending, processing, completed, failed
    status_message = Column(Text, nullable=True)
    total_tables = Column(Integer, default=0)
    uploaded_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    # Relationships
    pages = relationship("DocumentPage", back_populates="document", cascade="all, delete-orphan")
    tables = relationship("ExtractedTable", back_populates="document", cascade="all, delete-orphan")
    conversations = relationship("Conversation", back_populates="document", cascade="all, delete-orphan")

class DocumentPage(Base):
    __tablename__ = "document_pages"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)  # 1-indexed
    extracted_text = Column(Text, nullable=False, default="")
    word_count = Column(Integer, default=0)
    has_tables = Column(Boolean, default=False)

    document = relationship("Document", back_populates="pages")

class ExtractedTable(Base):
    __tablename__ = "extracted_tables"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    document_id = Column(String(36), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    page_number = Column(Integer, nullable=False)
    table_index = Column(Integer, default=0)
    table_title = Column(String(255), nullable=True, default="Table")
    headers_json = Column(Text, nullable=False, default="[]")
    rows_json = Column(Text, nullable=False, default="[]")
    raw_text = Column(Text, nullable=False, default="")
    row_count = Column(Integer, default=0)
    col_count = Column(Integer, default=0)

    document = relationship("Document", back_populates="tables")
