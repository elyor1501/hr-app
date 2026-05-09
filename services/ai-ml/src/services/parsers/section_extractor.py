from __future__ import annotations
import re
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

logger = logging.getLogger(__name__)

@dataclass
class ExtractedItem:
    value: str
    confidence: float = 0.95
    source: str = "verbatim"


# spaCy singleton — loaded once, reused across all requests
_NLP = None
_SPACY_AVAILABLE: bool | None = None  # None = not yet checked


def _get_spacy_available() -> bool:
    global _SPACY_AVAILABLE
    if _SPACY_AVAILABLE is None:
        try:
            import spacy
            _SPACY_AVAILABLE = True
        except ImportError:
            _SPACY_AVAILABLE = False
            logger.warning("spacy_not_installed: prose skill extraction will use dependency patterns")
    return _SPACY_AVAILABLE


def _get_nlp():
    global _NLP
    if _NLP is None:
        import spacy
        try:
            _NLP = spacy.load("en_core_web_sm")
        except OSError:
            logger.warning("spacy_model_not_found: run 'python -m spacy download en_core_web_sm'")
            _NLP = False  # sentinel so we don't retry every call
    return _NLP if _NLP else None

_SPLIT_RE = re.compile(r"[•\*►▪;\n\t]+")

# Words that indicate a phrase is a sentence fragment, not a skill name
_SKIP_WORDS: frozenset[str] = frozenset({
    "experience", "knowledge", "expertise", "exposure", "proficiency",
    "understanding", "familiarity", "background", "various", "working",
    "worked", "across", "including", "covering", "having", "involving",
    "utilizing", "using", "handling", "managing", "responsible",
})

# Detect sentence-format by scanning RAW lines for preamble patterns
_PREAMBLE_RE = re.compile(
    r"\b(?:experience|knowledge|expertise|exposure|proficiency|familiarity|"
    r"understanding|hands[- ]on|worked|background|grounding)\b",
    re.I,
)


def _is_sentence_format(section_text: str) -> bool:
    """
    Scan raw section lines for skill-description preambles.
    More reliable than checking word counts of comma-split tokens — short comma-separated
    items (Procedure, IDocs, BDC) would otherwise dilute the sentence percentage.
    """
    lines = [l.strip() for l in section_text.splitlines() if len(l.strip()) > 5]
    if not lines:
        return False
    sentence_lines = sum(
        1 for l in lines
        if _PREAMBLE_RE.search(l) or len(l.split()) > 8
    )
    return sentence_lines / len(lines) > 0.25


def extract_verbatim(section_text: str) -> list[ExtractedItem]:
    """Split skills section text into individual skill items verbatim."""
    # Split on bullets and newlines only — NOT commas, to avoid splitting "SAP S/4 HANA"
    raw = _SPLIT_RE.split(section_text)
    # Also handle comma-separated lists that are genuinely single-line enumerations
    expanded: list[str] = []
    for token in raw:
        # If the token looks like a comma list of short items, split it further
        stripped = token.strip()
        if "," in stripped and not any(
            _PREAMBLE_RE.search(part) for part in stripped.split(",")
        ):
            expanded.extend(stripped.split(","))
        else:
            expanded.append(stripped)

    seen: set[str] = set()
    results: list[ExtractedItem] = []
    for token in expanded:
        cleaned = token.strip().strip(".:•-")
        if len(cleaned) < 2 or len(cleaned) > 60:
            continue
        words = cleaned.split()
        # Filter sentence fragments even in verbatim mode
        if any(w.lower() in _SKIP_WORDS for w in words):
            continue
        if len(words) > 6:
            continue
        key = cleaned.lower()
        if key not in seen:
            seen.add(key)
            results.append(ExtractedItem(value=cleaned))
    return results


def extract_with_spacy(section_text: str) -> list[ExtractedItem]:
    """
    Extract skill names from prose text using spaCy POS tagging + ESCO vocabulary validation.
    Designed for sentence-format skills sections (gerunds, narrative descriptions) where
    extract_verbatim() produces sentence fragments.

    Strategy:
    1. Run spaCy to get noun chunks and PROPN tokens
    2. Validate each candidate against the ESCO + built-in vocabulary index
    3. Only vocabulary-confirmed terms are returned — this eliminates narrative noise

    Falls back to dependency pattern matching if spaCy is unavailable.
    """
    from .esco_matcher import _NORM_TO_CANONICAL, _normalise, _build_index
    from .dependency_matcher import extract_dependency_skills
    from .custom_skills_vocabulary import CUSTOM_SKILLS_LOOKUP

    if not _NORM_TO_CANONICAL:
        _build_index()

    if not _get_spacy_available():
        dep_matches = extract_dependency_skills(section_text)
        return [ExtractedItem(value=m.value, confidence=m.confidence, source=m.source) for m in dep_matches]

    nlp = _get_nlp()
    if nlp is None:
        dep_matches = extract_dependency_skills(section_text)
        return [ExtractedItem(value=m.value, confidence=m.confidence, source=m.source) for m in dep_matches]

    doc = nlp(section_text[:5000])
    seen: set[str] = set()
    results: list[ExtractedItem] = []

    def _resolve(text_clean: str) -> tuple[str, str] | None:
        """Return (canonical, source) if text matches ESCO or custom vocabulary, else None."""
        norm = _normalise(text_clean)
        if norm in _NORM_TO_CANONICAL:
            return _NORM_TO_CANONICAL[norm], "spacy"
        if norm in CUSTOM_SKILLS_LOOKUP:
            return CUSTOM_SKILLS_LOOKUP[norm], "custom"
        return None

    # Pass 1: noun chunks — catches multi-word skills ("SAP HANA", "Machine Learning")
    for chunk in doc.noun_chunks:
        text_clean = chunk.text.strip().strip(".,;:")
        if len(text_clean) < 2:
            continue
        match = _resolve(text_clean)
        if match:
            canonical, src = match
            key = canonical.lower()
            if key not in seen:
                seen.add(key)
                results.append(ExtractedItem(value=canonical, confidence=0.85, source=src))

    # Pass 2: individual PROPN tokens — catches single-word skills ("Python", "ABAP", "BTP")
    for token in doc:
        if token.pos_ == "PROPN" and len(token.text) > 1:
            text_clean = token.text.strip().strip(".,;:")
            match = _resolve(text_clean)
            if match:
                canonical, src = match
                key = canonical.lower()
                if key not in seen:
                    seen.add(key)
                    results.append(ExtractedItem(value=canonical, confidence=0.80, source=src))

    return results
