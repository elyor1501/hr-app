from dataclasses import dataclass
from typing import List, Any, Optional


@dataclass
class PageExtraction:
    page_number: int
    text: Any
    method: str
    confidence: float


@dataclass
class PDFExtractionResult:
    text: str
    pages: List[PageExtraction]
    confidence: float
    time_taken: float
    memory_mb: float
    error: Optional[object] = None
