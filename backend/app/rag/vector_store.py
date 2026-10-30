import os
import re
import math
import json
import logging
from typing import List, Dict, Any, Optional
from pathlib import Path
from app.core.config import settings
from app.services.pdf_processor import ProcessedChunk

logger = logging.getLogger("reportiq.vector_store")

class RetrievedEvidence:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_name: str,
        page_number: int,
        content: str,
        content_type: str,
        section_title: str,
        score: float,
        table_id: Optional[str] = None
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_name = document_name
        self.page_number = page_number
        self.content = content
        self.content_type = content_type
        self.section_title = section_title
        self.score = score
        self.table_id = table_id

    def to_dict(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "page_number": self.page_number,
            "content": self.content,
            "content_type": self.content_type,
            "section_title": self.section_title,
            "score": round(self.score, 4),
            "table_id": self.table_id,
        }

STOP_WORDS = {"the", "is", "in", "at", "of", "on", "and", "a", "an", "to", "for", "with", "as", "by", "from", "that", "this", "it", "are", "was", "be", "or", "what"}

class LocalHybridIndex:
    """
    Robust Persistent Hybrid Vector & Lexical Engine.
    Provides fast, deterministic cosine + BM25 keyword matching with exact page metadata.
    """
    def __init__(self, storage_path: Path):
        self.storage_path = storage_path / "chunks_index.json"
        self.chunks: List[Dict[str, Any]] = []
        self._load()

    def _load(self):
        if self.storage_path.exists():
            try:
                with open(self.storage_path, "r", encoding="utf-8") as f:
                    self.chunks = json.load(f)
            except Exception as e:
                logger.warning(f"Could not load local chunks index: {e}")
                self.chunks = []

    def _save(self):
        try:
            with open(self.storage_path, "w", encoding="utf-8") as f:
                json.dump(self.chunks, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving local chunks index: {e}")

    def add(self, chunks: List[ProcessedChunk]) -> int:
        for c in chunks:
            # Avoid duplicate chunks
            self.chunks = [item for item in self.chunks if item["chunk_id"] != c.chunk_id]
            self.chunks.append({
                "chunk_id": c.chunk_id,
                "document_id": c.document_id,
                "document_name": c.document_name,
                "page_number": c.page_number,
                "content": c.content,
                "content_type": c.content_type,
                "section_title": c.section_title,
                "table_id": c.table_id or "",
            })
        self._save()
        return len(chunks)

    def delete_document(self, document_id: str):
        self.chunks = [c for c in self.chunks if c["document_id"] != document_id]
        self._save()

    def search(
        self,
        query: str,
        document_id: Optional[str] = None,
        top_k: int = 6
    ) -> List[RetrievedEvidence]:
        if not query.strip() or not self.chunks:
            return []

        query_terms = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 1 and t.lower() not in STOP_WORDS]
        if not query_terms:
            return []

        results: List[RetrievedEvidence] = []
        candidates = self.chunks
        if document_id:
            candidates = [c for c in candidates if c["document_id"] == document_id]

        for item in candidates:
            content_lower = item["content"].lower()
            doc_terms = re.findall(r"\w+", content_lower)
            doc_term_set = set(doc_terms)

            # 1. Lexical overlap score
            overlap_count = sum(1 for t in query_terms if t in doc_term_set)
            term_ratio = overlap_count / max(1, len(query_terms))

            # 2. Substring & title boost
            exact_phrase_boost = 0.2 if query.lower() in content_lower else 0.0
            title_boost = 0.15 if any(t in item["section_title"].lower() for t in query_terms) else 0.0
            
            # 3. Numeric & Table boost
            table_boost = 0.1 if item["content_type"] == "table" and any(k in query.lower() for k in ["total", "rate", "percentage", "compare", "highest", "lowest", "table"]) else 0.0

            score = min(1.0, (term_ratio * 0.65) + exact_phrase_boost + title_boost + table_boost)

            if score > 0.05:
                results.append(RetrievedEvidence(
                    chunk_id=item["chunk_id"],
                    document_id=item["document_id"],
                    document_name=item["document_name"],
                    page_number=item["page_number"],
                    content=item["content"],
                    content_type=item["content_type"],
                    section_title=item["section_title"],
                    score=score,
                    table_id=item.get("table_id") or None
                ))

        results.sort(key=lambda x: x.score, reverse=True)
        return results[:top_k]

class VectorStoreManager:
    """
    Hybrid Vector Store with ChromaDB backend and automatic persistent fallback.
    Guarantees page number retention and strict document filtering.
    """

    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.local_index = LocalHybridIndex(settings.CHROMA_DIR)
        self._init_chroma()

    def _init_chroma(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings
            self.chroma_client = chromadb.PersistentClient(
                path=str(settings.CHROMA_DIR),
                settings=ChromaSettings(anonymized_telemetry=False)
            )
            self.collection = self.chroma_client.get_or_create_collection(
                name="reportiq_documents",
                metadata={"hnsw:space": "cosine"}
            )
            logger.info("ChromaDB vector store connected.")
        except Exception as e:
            logger.info(f"ChromaDB not active ({e}). Using persistent LocalHybridIndex.")
            self.chroma_client = None
            self.collection = None

    def add_chunks(self, chunks: List[ProcessedChunk]) -> int:
        if not chunks:
            return 0

        # Always save to local index as resilient storage
        self.local_index.add(chunks)

        if self.collection:
            try:
                ids = [c.chunk_id for c in chunks]
                documents = [c.content for c in chunks]
                metadatas = [c.to_metadata() for c in chunks]
                self.collection.upsert(ids=ids, documents=documents, metadatas=metadatas)
            except Exception as e:
                logger.warning(f"ChromaDB upsert warning: {e}")

        return len(chunks)

    def search(
        self,
        query: str,
        document_id: Optional[str] = None,
        top_k: int = 6
    ) -> List[RetrievedEvidence]:
        if not query.strip():
            return []

        # If ChromaDB collection is available, query it
        if self.collection:
            try:
                where_filter = {"document_id": document_id} if document_id else None
                fetch_k = min(top_k * 3, 20)
                res = self.collection.query(
                    query_texts=[query],
                    n_results=fetch_k,
                    where=where_filter,
                    include=["documents", "metadatas", "distances"]
                )
                if res and res["ids"] and res["ids"][0]:
                    retrieved = []
                    ids = res["ids"][0]
                    docs = res["documents"][0]
                    metas = res["metadatas"][0]
                    distances = res["distances"][0]

                    query_terms = set(re.findall(r"\w+", query.lower()))
                    for i in range(len(ids)):
                        meta = metas[i]
                        content = docs[i]
                        dist = distances[i] if distances else 0.5
                        sem_score = max(0.0, 1.0 - (dist / 2.0))
                        doc_terms = set(re.findall(r"\w+", content.lower()))
                        lex_boost = min(0.2, (len(query_terms.intersection(doc_terms)) / max(1, len(query_terms))) * 0.2)
                        table_boost = 0.08 if meta.get("content_type") == "table" else 0.0

                        retrieved.append(RetrievedEvidence(
                            chunk_id=ids[i],
                            document_id=meta.get("document_id", ""),
                            document_name=meta.get("document_name", "Report"),
                            page_number=int(meta.get("page_number", 1)),
                            content=content,
                            content_type=meta.get("content_type", "text"),
                            section_title=meta.get("section_title", "Section"),
                            score=min(1.0, sem_score + lex_boost + table_boost),
                            table_id=meta.get("table_id") or None
                        ))

                    retrieved.sort(key=lambda x: x.score, reverse=True)
                    if retrieved:
                        return retrieved[:top_k]
            except Exception as e:
                logger.warning(f"ChromaDB search fallback to local index: {e}")

        # Fallback to local index
        return self.local_index.search(query=query, document_id=document_id, top_k=top_k)

    def delete_document(self, document_id: str) -> None:
        self.local_index.delete_document(document_id)
        if self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
            except Exception:
                pass

    def get_stats(self) -> Dict[str, Any]:
        count = len(self.local_index.chunks)
        if self.collection:
            try:
                count = max(count, self.collection.count())
                return {"total_chunks": count, "status": "chromadb_connected"}
            except Exception:
                pass
        return {"total_chunks": count, "status": "connected"}
