import time
import tracemalloc
from pathlib import Path

from docx import Document

from .models import DocxExtractionResult, DocxBlock
from .confidence import compute_docx_confidence
from .exceptions import (
    DocxExtractionError,
    CorruptedDocxError,
)


class DOCXExtractor:

    def extract(self, path: str) -> DocxExtractionResult:

        start = time.time()
        tracemalloc.start()

        blocks = []
        error = None
        full_text = ""

        try:
            path = Path(path)

            if not path.is_absolute():
                project_root = Path(__file__).resolve().parents[4]
                path = project_root / path

            path = str(path)

            try:
                document = Document(path)
            except Exception as exc:
                raise CorruptedDocxError(
                    f"Failed to open DOCX: {exc}"
                ) from exc

            seen_texts = set()

            for para in document.paragraphs:
                text = para.text.strip()
                if not text:
                    continue
                if text in seen_texts:
                    continue
                seen_texts.add(text)

                style = para.style.name if para.style else ""
                block_type = "list" if "List" in style else "paragraph"

                blocks.append(
                    DocxBlock(
                        type=block_type,
                        text=text,
                        metadata={"style": style},
                        confidence=0.9,
                    )
                )

            for table in document.tables:
                rows = []
                table_texts = []
                for row in table.rows:
                    row_cells = [cell.text.strip() for cell in row.cells]
                    rows.append(row_cells)
                    for cell_text in row_cells:
                        if cell_text and cell_text not in seen_texts:
                            seen_texts.add(cell_text)
                            table_texts.append(cell_text)

                if table_texts:
                    blocks.append(
                        DocxBlock(
                            type="table",
                            text="\n".join(table_texts),
                            metadata={"rows": rows},
                            confidence=0.95,
                        )
                    )

            for section in document.sections:
                header_text = "\n".join(
                    p.text for p in section.header.paragraphs
                    if p.text.strip() and p.text.strip() not in seen_texts
                )
                if header_text:
                    for line in header_text.split("\n"):
                        seen_texts.add(line)
                    blocks.append(
                        DocxBlock(
                            type="header",
                            text=header_text,
                            metadata={},
                            confidence=0.9,
                        )
                    )

                footer_text = "\n".join(
                    p.text for p in section.footer.paragraphs
                    if p.text.strip() and p.text.strip() not in seen_texts
                )
                if footer_text:
                    for line in footer_text.split("\n"):
                        seen_texts.add(line)
                    blocks.append(
                        DocxBlock(
                            type="footer",
                            text=footer_text,
                            metadata={},
                            confidence=0.9,
                        )
                    )

            full_text = "\n\n".join(
                b.text for b in blocks if b.text
            )

        except Exception as exc:
            error = DocxExtractionError(
                message=str(exc),
                stage="docx_extraction_pipeline",
            )
            blocks = []
            full_text = ""

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        peak_mb = peak / (1024 * 1024)

        return DocxExtractionResult(
            text=full_text,
            blocks=blocks,
            confidence=compute_docx_confidence(blocks),
            time_taken=round(time.time() - start, 2),
            memory_mb=round(peak_mb, 2),
            error=error,
        )


def extract_docx(path: str) -> DocxExtractionResult:
    extractor = DOCXExtractor()
    return extractor.extract(path)