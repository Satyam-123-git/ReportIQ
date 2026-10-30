import os
import pytest
from app.services.pdf_processor import PDFProcessor

SAMPLE_PDF = os.path.join(
    os.path.dirname(__file__), "..", "sample_data", "sample_statistical_report.pdf"
)

def test_sample_pdf_exists():
    assert os.path.exists(SAMPLE_PDF), f"Sample PDF missing at {SAMPLE_PDF}"

def test_pdf_extraction_and_page_preservation():
    processor = PDFProcessor(chunk_size=500, chunk_overlap=80)
    pages, tables, chunks = processor.process_pdf(
        file_path=SAMPLE_PDF,
        document_id="test_doc_001",
        document_name="sample_statistical_report.pdf"
    )

    # 1. Page count preservation
    assert len(pages) == 4, f"Expected 4 pages, got {len(pages)}"
    for idx, page in enumerate(pages):
        assert page["page_number"] == idx + 1, "Page number must be 1-indexed"
        assert len(page["extracted_text"]) > 20, "Page should contain extracted text"

    # 2. Table extraction
    assert len(tables) >= 3, f"Expected at least 3 tables, got {len(tables)}"
    table_pages = [t["page_number"] for t in tables]
    assert 2 in table_pages or 1 in table_pages, "Tables should preserve exact page numbers"

    # 3. Chunk metadata preservation
    assert len(chunks) > 0, "Expected generated chunks"
    for chunk in chunks:
        meta = chunk.to_metadata()
        assert meta["document_id"] == "test_doc_001"
        assert 1 <= meta["page_number"] <= 4
        assert meta["content_type"] in ["text", "table"]
