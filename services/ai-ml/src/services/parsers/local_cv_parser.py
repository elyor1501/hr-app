from __future__ import annotations
import re
from dataclasses import dataclass, field

from .section_detector import detect_sections
from .section_extractor import extract_verbatim
from .dependency_matcher import extract_dependency_skills

@dataclass
class ParsedSkill:
    value: str
    confidence: float
    source: str  # "verbatim" | "dependency"

@dataclass
class ParseResult:
    skills: list[ParsedSkill] = field(default_factory=list)
    email: str | None = None
    phone: str | None = None
    raw_sections: dict[str, str] = field(default_factory=dict)

_EMAIL_RE = re.compile(r"[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,7}")
_PHONE_RE = re.compile(r"(?:\+?\d[\d\s()\-\.]{6,}\d)")

def parse_cv(text: str) -> ParseResult:
    result = ParseResult()

    # Contact extraction — regex only, no NLP needed for these fields
    email_match = _EMAIL_RE.search(text)
    result.email = email_match.group(0) if email_match else None

    phone_match = _PHONE_RE.search(text)
    result.phone = phone_match.group(0).strip() if phone_match else None

    # Layer 1 — section detection
    sections = detect_sections(text)
    result.raw_sections = sections

    # Layer 2 — verbatim extraction from skills section
    seen: set[str] = set()
    if "skills" in sections:
        for item in extract_verbatim(sections["skills"]):
            key = item.value.lower()
            if key not in seen:
                seen.add(key)
                result.skills.append(
                    ParsedSkill(value=item.value, confidence=item.confidence, source=item.source)
                )

    # Layer 3 — dependency pattern matching across full text
    for match in extract_dependency_skills(text):
        key = match.value.lower()
        if key not in seen:
            seen.add(key)
            result.skills.append(
                ParsedSkill(value=match.value, confidence=match.confidence, source=match.source)
            )

    result.skills.sort(key=lambda s: s.confidence, reverse=True)
    return result