from dataclasses import dataclass
from typing import List, Dict, Optional


@dataclass
class DocxBlock:
    type: str              # paragraph | list | table | header | footer | textbox
    text: str
    metadata: Dict
    confidence: float


@dataclass
class DocxExtractionResult:
    text: str
    blocks: List[DocxBlock]
    confidence: float
    time_taken: float
    memory_mb: float
    error: Optional[object] = None
