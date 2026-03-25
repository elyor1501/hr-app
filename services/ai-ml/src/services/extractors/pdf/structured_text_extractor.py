from pathlib import Path
import pdfplumber

from .models import PageExtraction
from .exceptions import CorruptedPDFError


class StructuredTextPDFExtractor:
    """
    Layout-aware extractor for text PDFs.
    Uses pdfplumber to preserve blocks + tables.
    """

    def extract(self, path: str):
        path = str(Path(path))

        pages = []

        # ---- Open PDF safely ----
        try:
            pdf = pdfplumber.open(path)
        except Exception as exc:
            raise CorruptedPDFError(
                f"StructuredTextPDFExtractor failed to open PDF: {exc}"
            ) from exc

        # ---- Page-by-page extraction ----
        try:
            with pdf:
                for idx, page in enumerate(pdf.pages):
                    try:
                        # Primary extraction
                        text = page.extract_text() or ""

                        # Layout fallback
                        if not text.strip():
                            text = page.extract_text(layout=True) or ""

                        tables = page.extract_tables() or []

                        structured = {
                            "text": text,
                            "tables": tables,
                        }

                        alpha_ratio = sum(c.isalpha() for c in text) / max(len(text), 1)

                        pages.append(
                            PageExtraction(
                                page_number=idx + 1,
                                text=structured,
                                method="structured",
                                confidence=round(alpha_ratio, 2),
                            )
                        )

                    except Exception as exc:
                        raise CorruptedPDFError(
                            f"StructuredTextPDFExtractor failed on page {idx + 1}: {exc}"
                        ) from exc

        finally:
            try:
                pdf.close()
            except Exception:
                pass

        return pages
