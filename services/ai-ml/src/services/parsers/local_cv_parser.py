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
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    raw_sections: dict[str, str] = field(default_factory=dict)

_EMAIL_RE = re.compile(r"[\w.+\-]+@[\w\-]+\.[a-zA-Z]{2,7}")
_PHONE_RE = re.compile(r"(?:\+?\d[\d\s()\-\.]{6,}\d)")

# "Name: <value>" pattern used in tabular / German-style CVs
_NAME_LABEL_RE = re.compile(
    r"(?:full\s+)?name\s*[:\-]\s*([^\d\n@/:;|\\]{2,60})",
    re.IGNORECASE,
)

# Words that appear in section headings rather than person names
_HEADING_WORDS = frozenset({
    "curriculum", "vitae", "resume", "profile", "contact",
    "summary", "education", "experience", "skills", "objective",
    "about", "personal", "general", "information", "details",
    "training", "attendance", "confirmation", "page", "address",
    "references", "declaration", "overview", "introduction",
    "employment", "professional", "academic", "achievements",
    "certifications", "hobbies", "interests", "languages",
    "nationality", "marital", "status", "gender", "dob", "birth",
    "date", "born", "photograph", "photo", "signature",
})


def _is_name_word(w: str) -> bool:
    # Strip name-valid non-letter chars; remainder must be Unicode letters
    stripped = w.replace("-", "").replace("'", "").replace(".", "")
    return bool(stripped) and stripped.isalpha()


def _extract_name(text: str) -> str | None:
    # Primary pass: standalone name line in first 15 lines
    for line in text.splitlines()[:15]:
        line = line.strip()
        if not line:
            continue
        if re.search(r'[\d@/:;|\\+_=<>(){}[\]]', line):
            continue
        words = line.split()
        if not (2 <= len(words) <= 4):
            continue
        # Unicode-aware letter check — covers umlauts, accented chars, etc.
        if not all(_is_name_word(w) for w in words):
            continue
        if not words[0][0].isupper():
            continue
        if any(w.lower() in _HEADING_WORDS for w in words):
            continue
        return line

    # Fallback: "Name: <value>" label pattern (tabular / German-format CVs)
    label_match = _NAME_LABEL_RE.search(text[:2000])
    if label_match:
        candidate = label_match.group(1).strip()
        words = candidate.split()[:4]
        if len(words) >= 2 and all(_is_name_word(w) for w in words) and not any(
            w.lower() in _HEADING_WORDS for w in words
        ):
            return " ".join(words)

    return None

def parse_cv(text: str) -> ParseResult:
    result = ParseResult()

    result.full_name = _extract_name(text)

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