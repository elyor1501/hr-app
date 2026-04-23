import time
import tracemalloc
from dataclasses import dataclass, field
from typing import List, Optional
from pptx import Presentation
from pptx.util import Pt


@dataclass
class PptxExtractionResult:
    text: str
    confidence: float
    time_taken: float
    memory_mb: float
    error: Optional[str] = None


class PPTXExtractor:

    def extract(self, path: str) -> PptxExtractionResult:
        start = time.time()
        tracemalloc.start()

        full_text = ""
        error = None

        try:
            prs = Presentation(path)
            text_parts = []

            for slide_num, slide in enumerate(prs.slides, 1):
                slide_texts = []

                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_texts.append(shape.text.strip())

                    if shape.shape_type == 19:
                        table = shape.table
                        for row in table.rows:
                            row_text = " | ".join(
                                cell.text.strip()
                                for cell in row.cells
                                if cell.text.strip()
                            )
                            if row_text:
                                slide_texts.append(row_text)

                if slide_texts:
                    text_parts.append("\n".join(slide_texts))

            full_text = "\n\n".join(text_parts)

        except Exception as exc:
            error = str(exc)
            full_text = ""

        current, peak = tracemalloc.get_traced_memory()
        tracemalloc.stop()

        confidence = 0.9 if full_text.strip() else 0.0

        return PptxExtractionResult(
            text=full_text,
            confidence=confidence,
            time_taken=round(time.time() - start, 2),
            memory_mb=round(peak / (1024 * 1024), 2),
            error=error,
        )


def extract_pptx(path: str) -> PptxExtractionResult:
    extractor = PPTXExtractor()
    return extractor.extract(path)