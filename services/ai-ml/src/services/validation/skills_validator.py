from __future__ import annotations
import re
import logging

logger = logging.getLogger(__name__)

# ── Garbage patterns ──────────────────────────────────────────────────────────
# These match strings that look like dates, status lines, or other non-skill noise.

_GARBAGE_PATTERNS: list[re.Pattern] = [
    re.compile(r"^Stand\s*[:\-]?\s*\w", re.IGNORECASE),           # "Stand 09 7", "Stand: März"
    re.compile(r"^\d{4}$"),                                         # "2021"
    re.compile(r"^\d{1,2}[./\-]\d{2,4}$"),                        # "09.2024", "6/23"
    re.compile(
        r"^(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?"
        r"|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?"
        r"|Mai|Okt|Mär(?:z)?|Dez(?:ember)?)\s+\d{4}$",
        re.IGNORECASE,
    ),                                                               # "March 2024", "Mai 2023"
    re.compile(r"\d{1,2}[./]\d{4}"),                               # contains embedded date
    re.compile(r"\d{4}\s*[-–]\s*\d{4}"),                           # "2020-2024" year range
    re.compile(r"^as\s+of\b", re.IGNORECASE),                      # "As of 2024"
    re.compile(r"^seit\b", re.IGNORECASE),                         # "Seit 2020"
    re.compile(r"^(?:ab|von|bis)\s+\d", re.IGNORECASE),           # "ab 2021", "von 2019"
]

# ── Non-skill term blocklist ───────────────────────────────────────────────────
# Generic soft-skill and management phrases that are not technical tools or technologies.

_NON_SKILL_TERMS: frozenset[str] = frozenset({
    "team management", "client management", "customer management",
    "resource planning", "resource management", "capacity planning",
    "solution design", "test plan", "test planning",
    "blueprint", "brd", "business requirements document",
    "communication", "teamwork", "leadership", "analytical",
    "problem solving", "problem-solving", "time management",
    "interpersonal skills", "organisational skills", "organizational skills",
    "attention to detail", "critical thinking", "decision making",
    "project management",  # too generic — PMP or PRINCE2 would pass the length check
    "stakeholder management", "change management",
})

# ── Length limits ──────────────────────────────────────────────────────────────
_MIN_CHARS = 2
_MAX_CHARS = 60
_MAX_WORDS = 6

# ── Labeled skills section detection ──────────────────────────────────────────
# Used only to decide whether to apply stricter or looser filtering (not for re-extraction).

_SKILLS_SECTION_RE = re.compile(
    r"(?:^|\n)\s*"
    r"(?:TECHNOLOGY\s+SUMMARY|TECHNICAL\s+SKILLS?|IT[\s\-]SKILLS?|"
    r"SKILLS?\s+(?:&|AND)\s+EXPERTISE|CORE\s+(?:COMPETENCIES|SKILLS?)|"
    r"TECH(?:NICAL)?\s+STACK|COMPETENC(?:Y|IES)|EXPERTISE|"
    r"IT[\s\-]KENNTNISSE|EDV[\s\-]KENNTNISSE|TECHNISCHE\s+KENNTNISSE|"
    r"(?:FACH)?KENNTNISSE|KOMPETENZEN|FACHKENNTNISSE|QUALIFIKATIONEN|"
    r"TECHNOLOGIE[\s\-]PROFIL|TECHNOLOGIEN)",
    re.IGNORECASE,
)


def validate_skills(skills: list[str], raw_text: str) -> list[str]:
    """
    Clean and validate the skills list extracted by the LLM.

    Every CV has skills — an empty result after filtering means the filter was
    too aggressive, not that the CV had no skills. In that case the pre-filter
    list is returned with a logged warning so the data is preserved and can be
    corrected manually or in a future pipeline run.

    Returns the cleaned list, or the original list if cleaning would empty it.
    """
    if not skills:
        return skills

    cleaned = [s for s in skills if _is_acceptable(s)]

    if not cleaned:
        # Filtering removed everything — preserve originals and warn so the issue
        # can be diagnosed rather than silently losing skill data.
        logger.warning(
            "skills_validation_removed_all_items",
            extra={
                "original_count": len(skills),
                "sample": skills[:5],
                "has_skills_section": bool(_SKILLS_SECTION_RE.search(raw_text or "")),
            },
        )
        return skills

    if len(cleaned) < len(skills):
        logger.info(
            "skills_validation_filtered",
            extra={"before": len(skills), "after": len(cleaned)},
        )

    return cleaned


def _is_acceptable(skill: str) -> bool:
    """Return True if the skill string passes all quality gates."""
    if not skill or not isinstance(skill, str):
        return False

    value = skill.strip()

    if len(value) < _MIN_CHARS or len(value) > _MAX_CHARS:
        return False

    if len(value.split()) > _MAX_WORDS:
        return False

    for pattern in _GARBAGE_PATTERNS:
        if pattern.search(value):
            return False

    if value.lower() in _NON_SKILL_TERMS:
        return False

    return True
