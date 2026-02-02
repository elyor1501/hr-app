import time
import tracemalloc
from pathlib import Path

from docx import Document

from .models import DocxExtractionResult, DocxBlock
from .confidence import compute_docx_confidence
from .exceptions import (
    DocxExtractionError,
    UnsupportedDocxFormatError,
    CorruptedDocxError,
)


class DOCXExtractor:
    """
    Orchestrates DOCX extraction:

    • paragraphs + lists
    • tables
    • headers / footers
    • text boxes
    • timing + memory
    """

    def extract(self, path: str) -> DocxExtractionResult:

        start = time.time()
        tracemalloc.start()

        blocks = []
        error = None
        full_text = ""

        try:

           
            # Normalize path
            
            path = Path(path)

            if not path.is_absolute():
                project_root = Path(__file__).resolve().parents[4]
                path = project_root / path

            path = str(path)

            
            # Validate extension
        
            if not path.lower().endswith(".docx"):
                raise UnsupportedDocxFormatError(
                    f"Unsupported file type: {path}"
                )

     
            # Load DOCX
            
            try:
                document = Document(path)
            except Exception as exc:
                raise CorruptedDocxError(
                    f"Failed to open DOCX: {exc}"
                ) from exc

            
            # Paragraphs + lists
            
            for para in document.paragraphs:

                text = para.text.strip()
                if not text:
                    continue

                style = para.style.name if para.style else ""

                block_type = "paragraph"

                if "List" in style:
                    block_type = "list"

                blocks.append(
                    DocxBlock(
                        type=block_type,
                        text=text,
                        metadata={"style": style},
                        confidence=0.9,
                    )
                )

            # Tables
        
            for table in document.tables:

                rows = []

                for row in table.rows:
                    rows.append(
                        [cell.text.strip() for cell in row.cells]
                    )

                blocks.append(
                    DocxBlock(
                        type="table",
                        text="",
                        metadata={"rows": rows},
                        confidence=0.95,
                    )
                )

           
            # Headers & footers
            
            for section in document.sections:

                header_text = "\n".join(
                    p.text for p in section.header.paragraphs
                    if p.text.strip()
                )

                if header_text:
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
                    if p.text.strip()
                )

                if footer_text:
                    blocks.append(
                        DocxBlock(
                            type="footer",
                            text=footer_text,
                            metadata={},
                            confidence=0.9,
                        )
                    )

            
            # Textboxes (via XML)
           
            for para in document.paragraphs:

                runs = para._p.xpath(".//w:t")

                for run in runs:
                    txt = run.text.strip()
                    if txt:
                        blocks.append(
                            DocxBlock(
                                type="textbox",
                                text=txt,
                                metadata={},
                                confidence=0.85,
                            )
                        )

            
            # Build full text
           
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

      
        # Memory tracking
        
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
