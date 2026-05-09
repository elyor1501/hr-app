from __future__ import annotations
import logging
from .models import PageExtraction

logger = logging.getLogger(__name__)


class PyMuPDFExtractor:
    """
    First-stage PDF text extractor using PyMuPDF (fitz).
    Preferred over pdfplumber for multi-column and table-heavy layouts because
    it extracts text blocks with positional data and handles complex layouts better.
    Gracefully unavailable if the package is not installed.
    """

    def extract(self, path: str) -> list[PageExtraction]:
        try:
            import fitz  # type: ignore[import]
        except ImportError:
            logger.debug("pymupdf_not_installed: skipping to pdfplumber")
            return []

        pages: list[PageExtraction] = []
        try:
            doc = fitz.open(path)
            for page in doc:
                # sort=True preserves natural reading order across columns
                text = page.get_text("text", sort=True).strip()
                pages.append(PageExtraction(
                    page_number=page.number + 1,
                    text=text,
                    method="pymupdf",
                    confidence=0.92 if text else 0.0,
                ))
            doc.close()
        except Exception as exc:
            logger.warning("pymupdf_extraction_failed: %s", exc)
            return []

        return pages
