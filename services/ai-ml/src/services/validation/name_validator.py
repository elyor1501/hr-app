from __future__ import annotations
import re
import logging

logger = logging.getLogger(__name__)

# ── Structural pre-filters (fast, no model) ────────────────────────────────────

# Digits anywhere in a name candidate → immediate reject
_DIGIT_RE = re.compile(r"\d")

# Characters that cannot appear in a human name
_INVALID_CHARS_RE = re.compile(r"[<>()\[\]{}/\\@#$%^&*=+|;\"~`!?_]")

# Initials-only: "GF", "G.F.", "EF", "M.K.", "MBT" (2–4 uppercase letter tokens)
_INITIALS_RE = re.compile(r"^([A-Z]\.?){2,4}$")

# Line-start anchor (MULTILINE) prevents matching "Skill Name:" mid-line.
_NAME_LABEL_CHECK_RE = re.compile(
    r"^[\s]*"
    r"(?:(?:full\s+)?name|"
    r"vor(?:\s*-?\s*und\s+nach)?name|"
    r"name\s+des\s+bewerbers?|"
    r"familienname|nachname|surname|"
    r"kandidat(?:en)?name)\s*[:\-]\s*",
    re.IGNORECASE | re.MULTILINE,
)

# Section-heading words that must never appear as candidate name tokens.
# Mirrors _HEADING_WORDS in local_cv_parser.py (positional scan) — duplicated
# here intentionally to avoid a cross-package import.
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
    "administrator", "developer", "consultant", "engineer", "analyst",
    "architect", "manager", "specialist", "programmer", "designer",
    "technician", "officer", "director", "executive", "intern", "trainee",
    "profil", "lebenslauf", "von",
})

# Recovery: extract a labeled-field name from raw_text as a last resort
_NAME_LABEL_RECOVER_RE = re.compile(
    r"^[\s]*"
    r"(?:(?:full\s+)?name|"
    r"vor(?:\s*-?\s*und\s+nach)?name|"
    r"name\s+des\s+bewerbers?|"
    r"familienname|nachname|surname|"
    r"kandidat(?:en)?name)\s*[:\-]\s*"
    r"([^\d\n@/:;|\\]{2,60})",
    re.IGNORECASE | re.MULTILINE,
)

# ── spaCy NER (context-aware) ──────────────────────────────────────────────────

def _ner_is_person(value: str, raw_text: str) -> bool:
    """
    Return True if spaCy detects a PERSON entity in raw_text that matches value.

    Runs NER on document context (not the bare candidate string) so the model
    has the grammatical signal it needs to classify correctly. A 2-word string
    in isolation is ambiguous; the same string inside a CV header is not.
    """
    try:
        from services.parsers.section_extractor import _get_nlp
        nlp = _get_nlp()
        if nlp:
            # Personal data always appears in the first portion of a CV.
            context = raw_text[:2000]
            doc = nlp(context)
            value_lower = value.lower()
            return any(
                ent.label_ == "PERSON"
                and (
                    value_lower in ent.text.lower()
                    or ent.text.lower() in value_lower
                )
                for ent in doc.ents
            )
    except Exception as exc:
        logger.warning("ner_check_failed: %s", exc)

    # NER unavailable — initials and labeled-field paths (handled upstream)
    # are the only trusted sources. Reject rather than admit any title-case string.
    return False


# ── Public API ────────────────────────────────────────────────────────────────

def validate_name(name: str | None, raw_text: str) -> str:
    """
    Return a validated person name or "NA".

    Validation chain (in order):
    1. Structural pre-filters — fast rejection of obviously invalid strings.
    2. Initials special case — "GF", "G.F." etc. are always accepted.
    3. Labeled-field trust — if the name appears after a Name: label in the
       original document, accept it without NER (label is the strongest signal).
    4. spaCy NER — verified against PERSON entities detected in document context.

    If the candidate fails all gates, a recovery scan of raw_text for a labeled
    field is attempted before returning "NA".
    """
    candidate = _clean(name)
    if _passes(candidate, raw_text):
        return candidate

    # Recovery: search raw_text for a labeled name field the parser may have missed
    fallback = _extract_from_label(raw_text)
    if fallback and _passes(fallback, raw_text):
        return fallback

    return "NA"


def _clean(value: str | None) -> str:
    if not value:
        return ""
    return " ".join(value.strip().split())


def _passes(value: str, raw_text: str) -> bool:
    if not value or len(value) < 2:
        return False

    # Fast structural gates — no model needed
    if _DIGIT_RE.search(value):
        return False
    if _INVALID_CHARS_RE.search(value):
        return False
    if len(value.split()) > 5:
        return False

    # Initials: always trusted regardless of NER
    if _INITIALS_RE.match(value):
        return True

    # Labeled-field source: structural label is more reliable than any model
    if _is_from_labeled_field(value, raw_text):
        return True

    # Human names are title-cased — rejects "Available immediately",
    # "ABAP development for IDES", "English Skills advanced"
    words = value.split()
    if not all(w[0].isupper() for w in words):
        return False

    # Reject section headings that bleed into the name field —
    # rejects "Technology Summary", "English Skills"
    if any(w.lower() in _HEADING_WORDS for w in words):
        return False

    # Final gate: candidate must match a PERSON entity found in document context
    return _ner_is_person(value, raw_text)


def _is_from_labeled_field(name: str, raw_text: str) -> bool:
    """
    Check whether `name` appears immediately after a name label in raw_text.
    Uses re.escape so that names with dots, hyphens, etc. are matched exactly.
    """
    if not raw_text or not name:
        return False
    # Preserve both IGNORECASE and MULTILINE from the base pattern so the
    # line-start anchor functions correctly across the full document.
    pattern = re.compile(
        _NAME_LABEL_CHECK_RE.pattern + re.escape(name),
        re.IGNORECASE | re.MULTILINE,
    )
    return bool(pattern.search(raw_text))


def _extract_from_label(raw_text: str) -> str:
    """Search raw_text for any Name: label and return the value as a fallback."""
    if not raw_text:
        return ""
    m = _NAME_LABEL_RECOVER_RE.search(raw_text)
    if not m:
        return ""
    candidate = m.group(1).strip()
    words = candidate.split()[:4]
    if not words:
        return ""
    # Accept initials from labeled fields
    if len(words) == 1 and _INITIALS_RE.match(words[0]):
        return words[0]
    return " ".join(words)
