from __future__ import annotations
import re
from dataclasses import dataclass

@dataclass
class ExtractedItem:
    value: str
    confidence: float = 0.95
    source: str = "verbatim"

_SPLIT_RE = re.compile(r"[•\-\*►▪,;|\n\t]+")

def extract_verbatim(section_text: str) -> list[ExtractedItem]:
    """Split skills section text into individual skill items verbatim."""
    raw = _SPLIT_RE.split(section_text)
    seen: set[str] = set()
    results: list[ExtractedItem] = []
    for token in raw:
        cleaned = token.strip()
        if len(cleaned) < 2 or len(cleaned) > 60:
            continue
        key = cleaned.lower()
        if key not in seen:
            seen.add(key)
            results.append(ExtractedItem(value=cleaned))
    return results