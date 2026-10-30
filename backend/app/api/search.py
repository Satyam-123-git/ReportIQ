from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database.session import get_db
from app.models.document import Document
from app.schemas.search import SearchRequest, SearchResponse, SearchResultItem
from app.rag.vector_store import VectorStoreManager

router = APIRouter(prefix="/search", tags=["Search"])
vector_store = VectorStoreManager()

@router.post("", response_model=SearchResponse)
async def search_documents(request: SearchRequest, db: AsyncSession = Depends(get_db)):
    if not request.query.strip():
        return SearchResponse(query=request.query, total_results=0, results=[])

    # If document_id is provided, verify it exists
    if request.document_id:
        doc = await db.get(Document, request.document_id)
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")

    retrieved = vector_store.search(
        query=request.query,
        document_id=request.document_id,
        top_k=request.limit or 10
    )

    results = [
        SearchResultItem(
            document_id=r.document_id,
            document_name=r.document_name,
            page_number=r.page_number,
            content=r.content,
            content_type=r.content_type,
            score=r.score,
            table_title=r.section_title if r.content_type == "table" else None
        )
        for r in retrieved
    ]

    return SearchResponse(
        query=request.query,
        total_results=len(results),
        results=results
    )
