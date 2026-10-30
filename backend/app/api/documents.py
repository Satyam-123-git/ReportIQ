import os
import shutil
import uuid
import json
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, Response
from fastapi.responses import FileResponse, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

from app.core.config import settings
from app.database.session import get_db, AsyncSessionLocal
from app.models.document import Document, DocumentPage, ExtractedTable
from app.schemas.document import (
    DocumentSummary,
    DocumentDetailResponse,
    DocumentPageResponse,
    ExtractedTableResponse,
    DocumentUploadResponse,
)
from app.services.pdf_processor import PDFProcessor
from app.rag.vector_store import VectorStoreManager

router = APIRouter(prefix="/documents", tags=["Documents"])
logger = logging.getLogger("reportiq.api.documents")
pdf_processor = PDFProcessor(chunk_size=settings.CHUNK_SIZE, chunk_overlap=settings.CHUNK_OVERLAP)
vector_store = VectorStoreManager()

async def process_document_background(document_id: str, file_path: str, filename: str):
    """Background task to extract text, tables, compute chunks, and index into ChromaDB."""
    async with AsyncSessionLocal() as session:
        doc = await session.get(Document, document_id)
        if not doc:
            logger.error(f"Document {document_id} not found for background processing.")
            return

        try:
            doc.processing_status = "processing"
            doc.status_message = "Extracting text and identifying tables..."
            await session.commit()

            # Process PDF
            pages_data, tables_data, chunks = pdf_processor.process_pdf(
                file_path=file_path,
                document_id=document_id,
                document_name=filename
            )

            # Insert pages into SQLite
            for p in pages_data:
                db_page = DocumentPage(
                    document_id=document_id,
                    page_number=p["page_number"],
                    extracted_text=p["extracted_text"],
                    word_count=p["word_count"],
                    has_tables=p["has_tables"]
                )
                session.add(db_page)

            # Insert tables into SQLite
            for t in tables_data:
                db_table = ExtractedTable(
                    id=t["id"],
                    document_id=document_id,
                    page_number=t["page_number"],
                    table_index=t["table_index"],
                    table_title=t["table_title"],
                    headers_json=json.dumps(t["headers"]),
                    rows_json=json.dumps(t["rows"]),
                    raw_text=t["raw_text"],
                    row_count=t["row_count"],
                    col_count=t["col_count"]
                )
                session.add(db_table)

            # Update doc metadata
            doc.total_pages = len(pages_data)
            doc.total_tables = len(tables_data)
            doc.status_message = f"Generating embeddings and indexing {len(chunks)} chunks..."
            await session.commit()

            # Index chunks in ChromaDB
            indexed_count = vector_store.add_chunks(chunks)

            # Mark complete
            doc.processing_status = "completed"
            doc.status_message = f"Successfully indexed {len(pages_data)} pages, {len(tables_data)} tables, {indexed_count} chunks."
            doc.processed_at = datetime.utcnow()
            await session.commit()
            logger.info(f"Document {document_id} processed successfully.")

        except Exception as e:
            logger.exception(f"Failed to process document {document_id}: {e}")
            doc.processing_status = "failed"
            doc.status_message = f"Processing error: {str(e)}"
            await session.commit()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db)
):
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type '{ext}'. Only PDF documents are supported."
        )

    # Check size or stream safely
    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(str(settings.UPLOAD_DIR), safe_filename)

    total_bytes = 0
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    with open(file_path, "wb") as buffer:
        while content := await file.read(1024 * 1024):  # 1MB chunks
            total_bytes += len(content)
            if total_bytes > max_bytes:
                buffer.close()
                os.remove(file_path)
                raise HTTPException(
                    status_code=413,
                    detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
                )
            buffer.write(content)

    # Create document record
    new_doc = Document(
        id=doc_id,
        filename=safe_filename,
        original_filename=file.filename,
        file_path=file_path,
        file_size=total_bytes,
        total_pages=0,
        processing_status="pending",
        status_message="Queued for extraction and indexing.",
        uploaded_at=datetime.utcnow()
    )
    db.add(new_doc)
    await db.commit()

    # Trigger background ingestion
    background_tasks.add_task(
        process_document_background,
        document_id=doc_id,
        file_path=file_path,
        filename=file.filename
    )

    return DocumentUploadResponse(
        document_id=doc_id,
        filename=file.filename,
        file_size=total_bytes,
        status="pending",
        message="Document uploaded successfully. Background processing and vector indexing initiated."
    )

@router.get("", response_model=List[DocumentSummary])
async def list_documents(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).order_by(Document.uploaded_at.desc()))
    docs = result.scalars().all()
    return docs

@router.get("/{document_id}", response_model=DocumentDetailResponse)
async def get_document(document_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Fetch pages
    p_result = await db.execute(
        select(DocumentPage)
        .where(DocumentPage.document_id == document_id)
        .order_by(DocumentPage.page_number)
    )
    pages = p_result.scalars().all()

    # Fetch tables
    t_result = await db.execute(
        select(ExtractedTable)
        .where(ExtractedTable.document_id == document_id)
        .order_by(ExtractedTable.page_number, ExtractedTable.table_index)
    )
    tables = t_result.scalars().all()

    formatted_tables = [
        ExtractedTableResponse(
            id=t.id,
            document_id=t.document_id,
            page_number=t.page_number,
            table_index=t.table_index,
            table_title=t.table_title,
            headers=json.loads(t.headers_json),
            rows=json.loads(t.rows_json),
            raw_text=t.raw_text,
            row_count=t.row_count,
            col_count=t.col_count
        ) for t in tables
    ]

    formatted_pages = [
        DocumentPageResponse(
            id=p.id,
            document_id=p.document_id,
            page_number=p.page_number,
            extracted_text=p.extracted_text,
            word_count=p.word_count,
            has_tables=p.has_tables,
            tables=[t for t in formatted_tables if t.page_number == p.page_number]
        ) for p in pages
    ]

    return DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        original_filename=doc.original_filename,
        file_size=doc.file_size,
        total_pages=doc.total_pages,
        processing_status=doc.processing_status,
        status_message=doc.status_message,
        total_tables=doc.total_tables,
        uploaded_at=doc.uploaded_at,
        processed_at=doc.processed_at,
        pages=formatted_pages,
        tables=formatted_tables
    )

@router.delete("/{document_id}")
async def delete_document(document_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    # Delete physical file
    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            logger.warning(f"Failed to delete file {doc.file_path}: {e}")

    # Delete from ChromaDB
    vector_store.delete_document(document_id)

    # Delete from DB
    await db.delete(doc)
    await db.commit()

    return {"success": True, "message": f"Document '{doc.original_filename}' and its embeddings removed successfully."}

@router.get("/{document_id}/pages/{page_number}", response_model=DocumentPageResponse)
async def get_document_page(
    document_id: str,
    page_number: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(DocumentPage).where(
            DocumentPage.document_id == document_id,
            DocumentPage.page_number == page_number
        )
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")

    # Fetch tables on this page
    t_result = await db.execute(
        select(ExtractedTable).where(
            ExtractedTable.document_id == document_id,
            ExtractedTable.page_number == page_number
        )
    )
    tables = t_result.scalars().all()
    formatted_tables = [
        ExtractedTableResponse(
            id=t.id,
            document_id=t.document_id,
            page_number=t.page_number,
            table_index=t.table_index,
            table_title=t.table_title,
            headers=json.loads(t.headers_json),
            rows=json.loads(t.rows_json),
            raw_text=t.raw_text,
            row_count=t.row_count,
            col_count=t.col_count
        ) for t in tables
    ]

    return DocumentPageResponse(
        id=page.id,
        document_id=page.document_id,
        page_number=page.page_number,
        extracted_text=page.extracted_text,
        word_count=page.word_count,
        has_tables=page.has_tables,
        tables=formatted_tables
    )

@router.get("/{document_id}/pdf")
async def serve_document_pdf(document_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="PDF file not found")

    return FileResponse(
        doc.file_path,
        media_type="application/pdf",
        filename=doc.original_filename
    )

@router.get("/{document_id}/pages/{page_number}/image")
async def serve_page_image(
    document_id: str,
    page_number: int,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Document).where(Document.id == document_id))
    doc = result.scalar_one_or_none()
    if not doc or not os.path.exists(doc.file_path):
        raise HTTPException(status_code=404, detail="Document not found")

    png_bytes = PDFProcessor.render_page_to_png(doc.file_path, page_number)
    if not png_bytes:
        raise HTTPException(status_code=500, detail="Failed to render page image")

    return Response(content=png_bytes, media_type="image/png")
