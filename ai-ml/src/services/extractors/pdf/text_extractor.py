from pypdf import PdfReader

from .models import PageExtraction
from .exceptions import CorruptedPDFError


def _clean_text(text: str) -> str:
    return (
        text.replace("\u00a0", " ")
        .replace("", "•")
        .replace("¢", "•")
        .strip()
    )
    
class TextPDFExtractor:
    def extract(self, path: str):
        # --- Open PDF safely ---
        try:
            reader = PdfReader(path)
        except Exception as exc:
            raise CorruptedPDFError(
                f"TextPDFExtractor failed to open PDF: {exc}"
            ) from exc

        pages = []

        # --- Per-page safe extraction ---
        for idx, page in enumerate(reader.pages):
            try:
                raw_text = page.extract_text(extraction_mode="layout") or ""
                text = _clean_text(raw_text)

                confidence = min(1.0, len(text.split()) / 250)

                pages.append(
                    PageExtraction(
                        page_number=idx + 1,
                        text=text,
                        method="text",
                        confidence=confidence,
                    )
                )

            except Exception as exc:
                # Page-level failure → escalate to full document failure
                raise CorruptedPDFError(
                    f"TextPDFExtractor failed on page {idx + 1}: {exc}"
                ) from exc

        return pages
