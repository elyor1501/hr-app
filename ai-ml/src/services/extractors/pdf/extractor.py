import time
import tracemalloc
from pathlib import Path

from .text_extractor import TextPDFExtractor
from .structured_text_extractor import StructuredTextPDFExtractor
from .ocr_extractor import OCRPDFExtractor
from .confidence import compute_overall_confidence
from .models import PDFExtractionResult
from .exceptions import PDFExtractionError


class PDFExtractor:
    """
    Orchestrates PDF extraction:

    1. Structured extraction first (pdfplumber)
    2. OCR ONLY pages that have no text
    3. Never re-run extractors unnecessarily
    """

    def extract(self, path: str) -> PDFExtractionResult:

        start = time.time()
        tracemalloc.start()

        error = None
        final_pages = []
        full_text = ""
        confidence = 0.0

        try:

            
            # Normalize path
            
            path = Path(path)

            if not path.is_absolute():
                project_root = Path(__file__).resolve().parents[4]
                path = project_root / path

            path = str(path)

           
            # STEP 1 — Structured extraction
            
            structured_pages = StructuredTextPDFExtractor().extract(path)

            
            # STEP 2 — OCR only EMPTY pages
        
            ocr_extractor = OCRPDFExtractor()

            for page in structured_pages:

                text = ""

                if isinstance(page.text, dict):
                    text = page.text.get("text", "")
                elif isinstance(page.text, str):
                    text = page.text

                if text and text.strip():
                    final_pages.append(page)
                    continue

                # ---- page has no usable text → OCR it ----
                ocr_page = ocr_extractor.extract_page(path, page.page_number)
                final_pages.append(ocr_page)

           
            # STEP 3 — Fallback to pypdf if structured failed entirely
            
            if not final_pages:

                text_pages = TextPDFExtractor().extract(path)

                for page in text_pages:

                    if page.text and page.text.strip():
                        final_pages.append(page)
                        continue

                    ocr_page = ocr_extractor.extract_page(path, page.page_number)
                    final_pages.append(ocr_page)

            
            # STEP 4 — Build output
            
            parts = []

            for p in final_pages:
                if isinstance(p.text, dict):
                    parts.append(p.text.get("text", ""))
                else:
                    parts.append(p.text)

            full_text = "\n\n".join(parts)
            confidence = compute_overall_confidence(final_pages)

        except Exception as exc:

            error = PDFExtractionError(
                message=str(exc),
                stage="pdf_extraction_pipeline",
            )

            final_pages = []
            full_text = ""
            confidence = 0.0

        
        # Memory tracking
    
        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        peak_mb = peak / (1024 * 1024)

        return PDFExtractionResult(
            text=full_text,
            pages=final_pages,
            confidence=confidence,
            time_taken=round(time.time() - start, 2),
            memory_mb=round(peak_mb, 2),
            error=error,
        )
