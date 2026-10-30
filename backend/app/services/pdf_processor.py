import os
import re
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime

logger = logging.getLogger("reportiq.pdf_processor")

class ProcessedChunk:
    def __init__(
        self,
        chunk_id: str,
        document_id: str,
        document_name: str,
        page_number: int,
        content: str,
        content_type: str = "text",
        section_title: str = "General",
        table_id: Optional[str] = None,
        table_data: Optional[Dict[str, Any]] = None,
    ):
        self.chunk_id = chunk_id
        self.document_id = document_id
        self.document_name = document_name
        self.page_number = page_number
        self.content = content
        self.content_type = content_type
        self.section_title = section_title
        self.table_id = table_id
        self.table_data = table_data

    def to_metadata(self) -> Dict[str, Any]:
        return {
            "chunk_id": self.chunk_id,
            "document_id": self.document_id,
            "document_name": self.document_name,
            "page_number": int(self.page_number),
            "content_type": self.content_type,
            "section_title": self.section_title,
            "table_id": self.table_id or "",
        }

class PDFProcessor:
    """
    Intelligent PDF Ingestion Engine:
    - Multi-engine extraction: pdfplumber, PyMuPDF, or pypdf
    - Precise table detection with header parsing
    - Exact 1-indexed page number preservation
    - Structured table conversion to Markdown, JSON, and Pandas-ready formats
    """

    def __init__(self, chunk_size: int = 600, chunk_overlap: int = 100):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    def process_pdf(
        self,
        file_path: str,
        document_id: str,
        document_name: str
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], List[ProcessedChunk]]:
        logger.info(f"Processing PDF: {file_path} (ID: {document_id})")

        pages_data = []
        tables_data = []
        chunks: List[ProcessedChunk] = []

        # Check for PyMuPDF
        has_fitz = False
        try:
            import fitz
            has_fitz = True
        except ImportError:
            pass

        # Check for pdfplumber
        has_pdfplumber = False
        try:
            import pdfplumber
            has_pdfplumber = True
        except ImportError:
            pass

        if has_fitz:
            pages_data, tables_data, chunks = self._process_with_fitz(
                file_path, document_id, document_name, has_pdfplumber
            )
        else:
            pages_data, tables_data, chunks = self._process_with_pypdf(
                file_path, document_id, document_name, has_pdfplumber
            )

        logger.info(f"Processed {len(pages_data)} pages, {len(tables_data)} tables, {len(chunks)} chunks.")
        return pages_data, tables_data, chunks

    def _process_with_fitz(
        self,
        file_path: str,
        document_id: str,
        document_name: str,
        has_pdfplumber: bool
    ):
        import fitz
        pages_data = []
        tables_data = []
        chunks = []

        doc = fitz.open(file_path)
        total_pages = len(doc)

        plumber_doc = None
        if has_pdfplumber:
            try:
                import pdfplumber
                plumber_doc = pdfplumber.open(file_path)
            except Exception:
                pass

        for page_idx in range(total_pages):
            page_number = page_idx + 1  # 1-indexed
            page = doc[page_idx]
            page_text = page.get_text("text").strip()

            primary_heading = f"Page {page_number}"
            page_tables = []

            # 1. Try pdfplumber table extraction
            if plumber_doc and page_idx < len(plumber_doc.pages):
                try:
                    p_page = plumber_doc.pages[page_idx]
                    raw_tables = p_page.extract_tables()
                    for t_idx, raw_tbl in enumerate(raw_tables):
                        parsed = self._clean_and_structure_table(
                            raw_table=raw_tbl,
                            document_id=document_id,
                            page_number=page_number,
                            table_index=t_idx
                        )
                        if parsed:
                            page_tables.append(parsed)
                            tables_data.append(parsed)
                except Exception as e:
                    logger.warning(f"plumber error on p{page_number}: {e}")

            # 2. Text-based table detection fallback
            if not page_tables:
                detected = self._extract_tables_from_text(page_text, document_id, page_number)
                for tbl in detected:
                    page_tables.append(tbl)
                    tables_data.append(tbl)

            pages_data.append({
                "page_number": page_number,
                "extracted_text": page_text,
                "word_count": len(page_text.split()),
                "has_tables": len(page_tables) > 0,
                "tables": page_tables
            })

            if page_text:
                text_chunks = self._chunk_text(
                    page_text, document_id, document_name, page_number, primary_heading
                )
                chunks.extend(text_chunks)

            for tbl in page_tables:
                chunks.append(ProcessedChunk(
                    chunk_id=f"doc_{document_id}_p{page_number}_tbl_{tbl['table_index']}",
                    document_id=document_id,
                    document_name=document_name,
                    page_number=page_number,
                    content=f"### Table: {tbl['table_title']} (Page {page_number})\n\n{tbl['raw_text']}",
                    content_type="table",
                    section_title=f"{primary_heading} - {tbl['table_title']}",
                    table_id=tbl["id"],
                    table_data={
                        "headers": tbl["headers"],
                        "rows": tbl["rows"],
                        "title": tbl["table_title"]
                    }
                ))

        if plumber_doc:
            plumber_doc.close()
        doc.close()
        return pages_data, tables_data, chunks

    def _process_with_pypdf(
        self,
        file_path: str,
        document_id: str,
        document_name: str,
        has_pdfplumber: bool
    ):
        import pypdf
        pages_data = []
        tables_data = []
        chunks = []

        reader = pypdf.PdfReader(file_path)
        total_pages = len(reader.pages)

        plumber_doc = None
        if has_pdfplumber:
            try:
                import pdfplumber
                plumber_doc = pdfplumber.open(file_path)
            except Exception:
                pass

        for page_idx in range(total_pages):
            page_number = page_idx + 1  # 1-indexed
            page = reader.pages[page_idx]
            page_text = page.extract_text() or ""
            page_text = page_text.strip()

            primary_heading = f"Page {page_number}"
            page_tables = []

            # 1. Try pdfplumber
            if plumber_doc and page_idx < len(plumber_doc.pages):
                try:
                    p_page = plumber_doc.pages[page_idx]
                    raw_tables = p_page.extract_tables()
                    for t_idx, raw_tbl in enumerate(raw_tables):
                        parsed = self._clean_and_structure_table(
                            raw_table=raw_tbl,
                            document_id=document_id,
                            page_number=page_number,
                            table_index=t_idx
                        )
                        if parsed:
                            page_tables.append(parsed)
                            tables_data.append(parsed)
                except Exception as e:
                    logger.warning(f"plumber error on p{page_number}: {e}")

            # 2. Text layout table reconstruction
            if not page_tables:
                detected = self._extract_tables_from_text(page_text, document_id, page_number)
                for tbl in detected:
                    page_tables.append(tbl)
                    tables_data.append(tbl)

            pages_data.append({
                "page_number": page_number,
                "extracted_text": page_text,
                "word_count": len(page_text.split()),
                "has_tables": len(page_tables) > 0,
                "tables": page_tables
            })

            if page_text:
                text_chunks = self._chunk_text(
                    page_text, document_id, document_name, page_number, primary_heading
                )
                chunks.extend(text_chunks)

            for tbl in page_tables:
                chunks.append(ProcessedChunk(
                    chunk_id=f"doc_{document_id}_p{page_number}_tbl_{tbl['table_index']}",
                    document_id=document_id,
                    document_name=document_name,
                    page_number=page_number,
                    content=f"### Table: {tbl['table_title']} (Page {page_number})\n\n{tbl['raw_text']}",
                    content_type="table",
                    section_title=f"{primary_heading} - {tbl['table_title']}",
                    table_id=tbl["id"],
                    table_data={
                        "headers": tbl["headers"],
                        "rows": tbl["rows"],
                        "title": tbl["table_title"]
                    }
                ))

        if plumber_doc:
            plumber_doc.close()
        return pages_data, tables_data, chunks

    def _extract_tables_from_text(
        self,
        text: str,
        document_id: str,
        page_number: int
    ) -> List[Dict[str, Any]]:
        """
        Layout and sequence based table detector.
        Reconstructs tables from multi-column text lines or sequential cell lists.
        """
        tables = []
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        if not lines:
            return []

        # Heuristic 1: Delimited or multi-column lines
        table_lines = []
        for line in lines:
            num_tokens = re.findall(r"\b\d+(?:\.\d+)?%?\b", line)
            is_candidate_row = (len(num_tokens) >= 2 or "|" in line or "\t" in line)
            if is_candidate_row:
                table_lines.append(line)
            else:
                if len(table_lines) >= 3:
                    parsed = self._parse_text_table(table_lines, document_id, page_number, len(tables))
                    if parsed:
                        tables.append(parsed)
                table_lines = []

        if len(table_lines) >= 3:
            parsed = self._parse_text_table(table_lines, document_id, page_number, len(tables))
            if parsed:
                tables.append(parsed)

        # Heuristic 2: Sequential stream cell reconstruction
        # Look for sequences where known column indicators occur, followed by repeated pattern of (entity, num, num...)
        if not tables:
            seq_table = self._reconstruct_sequential_table(lines, document_id, page_number, len(tables))
            if seq_table:
                tables.append(seq_table)

        return tables

    def _reconstruct_sequential_table(
        self,
        lines: List[str],
        document_id: str,
        page_number: int,
        idx: int
    ) -> Optional[Dict[str, Any]]:
        """Detects sequential cell emissions (e.g. State, Rate, Male, Female, Rank... State1, val1, val2...)"""
        # Search for a header block
        for i in range(len(lines) - 5):
            candidate_headers = []
            j = i
            while j < len(lines) and not re.match(r"^\d+(?:\.\d+)?%?$", lines[j]) and len(candidate_headers) < 8:
                # If line is short and looks like a column header
                if len(lines[j]) < 40 and not lines[j].endswith("."):
                    candidate_headers.append(lines[j])
                    j += 1
                else:
                    break

            if 3 <= len(candidate_headers) <= 6 and j < len(lines):
                # Try grouping remaining lines into rows of len(candidate_headers)
                col_count = len(candidate_headers)
                remaining = lines[j:]
                rows = []
                r_idx = 0
                while r_idx + col_count <= len(remaining):
                    candidate_row = remaining[r_idx:r_idx + col_count]
                    # Verify at least one cell in the row is numeric
                    has_numeric = any(re.search(r"\d", c) for c in candidate_row)
                    if has_numeric:
                        rows.append(candidate_row)
                        r_idx += col_count
                    else:
                        break

                if len(rows) >= 3:
                    header_line = "| " + " | ".join(candidate_headers) + " |"
                    sep_line = "| " + " | ".join(["---"] * len(candidate_headers)) + " |"
                    row_lines = ["| " + " | ".join(r) + " |" for r in rows]
                    markdown_text = "\n".join([header_line, sep_line] + row_lines)

                    return {
                        "id": f"tbl_{document_id}_{page_number}_{idx}",
                        "document_id": document_id,
                        "page_number": page_number,
                        "table_index": idx,
                        "table_title": f"Statistical Table {idx + 1} (Page {page_number})",
                        "headers": candidate_headers,
                        "rows": rows,
                        "raw_text": markdown_text,
                        "row_count": len(rows),
                        "col_count": len(candidate_headers)
                    }

        return None

    def _parse_text_table(
        self,
        lines: List[str],
        document_id: str,
        page_number: int,
        idx: int
    ) -> Optional[Dict[str, Any]]:
        rows = []
        for line in lines:
            if "|" in line:
                tokens = [c.strip() for c in line.split("|") if c.strip()]
            elif "\t" in line:
                tokens = [c.strip() for c in line.split("\t") if c.strip()]
            else:
                tokens = re.split(r"\s{2,}", line)
            if len(tokens) >= 2:
                rows.append(tokens)

        if len(rows) < 2:
            return None

        headers = rows[0]
        data_rows = rows[1:]

        header_line = "| " + " | ".join(headers) + " |"
        sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
        row_lines = []
        for r in data_rows:
            padded = r + [""] * max(0, len(headers) - len(r))
            row_lines.append("| " + " | ".join(padded[:len(headers)]) + " |")

        markdown_text = "\n".join([header_line, sep_line] + row_lines)

        return {
            "id": f"tbl_{document_id}_{page_number}_{idx}",
            "document_id": document_id,
            "page_number": page_number,
            "table_index": idx,
            "table_title": f"Statistical Table {idx + 1} (Page {page_number})",
            "headers": headers,
            "rows": data_rows,
            "raw_text": markdown_text,
            "row_count": len(data_rows),
            "col_count": len(headers)
        }

    def _clean_and_structure_table(
        self,
        raw_table: List[List[Any]],
        document_id: str,
        page_number: int,
        table_index: int
    ) -> Optional[Dict[str, Any]]:
        if not raw_table or len(raw_table) < 2:
            return None

        cleaned_grid = []
        for row in raw_table:
            cleaned_row = [
                str(cell).strip().replace("\n", " ") if cell is not None else ""
                for cell in row
            ]
            if any(cleaned_row):
                cleaned_grid.append(cleaned_row)

        if len(cleaned_grid) < 2:
            return None

        headers = cleaned_grid[0]
        headers = [h if h else f"Col_{i+1}" for i, h in enumerate(headers)]
        rows = cleaned_grid[1:]

        header_line = "| " + " | ".join(headers) + " |"
        sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
        row_lines = []
        for r in rows:
            padded = r + [""] * max(0, len(headers) - len(r))
            row_lines.append("| " + " | ".join(padded[:len(headers)]) + " |")

        markdown_text = "\n".join([header_line, sep_line] + row_lines)

        return {
            "id": f"tbl_{document_id}_{page_number}_{table_index}",
            "document_id": document_id,
            "page_number": page_number,
            "table_index": table_index,
            "table_title": f"Table {table_index + 1} (Page {page_number})",
            "headers": headers,
            "rows": rows,
            "raw_text": markdown_text,
            "row_count": len(rows),
            "col_count": len(headers)
        }

    def _chunk_text(
        self,
        text: str,
        document_id: str,
        document_name: str,
        page_number: int,
        section_title: str
    ) -> List[ProcessedChunk]:
        chunks = []
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        if not paragraphs:
            paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

        current_words: List[str] = []
        chunk_idx = 0

        for para in paragraphs:
            para_words = para.split()
            if not para_words:
                continue

            if len(current_words) + len(para_words) > self.chunk_size and current_words:
                chunk_str = " ".join(current_words)
                chunks.append(ProcessedChunk(
                    chunk_id=f"doc_{document_id}_p{page_number}_c{chunk_idx}",
                    document_id=document_id,
                    document_name=document_name,
                    page_number=page_number,
                    content=chunk_str,
                    content_type="text",
                    section_title=section_title
                ))
                chunk_idx += 1
                overlap_words = current_words[-self.chunk_overlap:] if len(current_words) > self.chunk_overlap else []
                current_words = overlap_words + para_words
            else:
                current_words.extend(para_words)

        if current_words:
            chunk_str = " ".join(current_words)
            chunks.append(ProcessedChunk(
                chunk_id=f"doc_{document_id}_p{page_number}_c{chunk_idx}",
                document_id=document_id,
                document_name=document_name,
                page_number=page_number,
                content=chunk_str,
                content_type="text",
                section_title=section_title
            ))

        return chunks

    @staticmethod
    def render_page_to_png(file_path: str, page_number: int, zoom: float = 2.0) -> Optional[bytes]:
        try:
            import fitz
            doc = fitz.open(file_path)
            if 1 <= page_number <= len(doc):
                page = doc[page_number - 1]
                pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
                png_bytes = pix.tobytes("png")
                doc.close()
                return png_bytes
            doc.close()
        except Exception:
            pass
        return None
