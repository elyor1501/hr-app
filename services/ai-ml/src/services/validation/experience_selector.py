from __future__ import annotations
import re
import logging
from typing import Any

logger = logging.getLogger(__name__)

# Named-section priority weights. Higher = more structured, preferred.
_SECTION_WEIGHTS: list[tuple[re.Pattern, int]] = [
    (re.compile(r"PROJECT\s+EXPERIENCE",       re.I), 10),
    (re.compile(r"BERUFSERFAHRUNG",             re.I), 10),
    (re.compile(r"ARBEITSERFAHRUNG",            re.I), 10),
    (re.compile(r"PROFESSIONAL\s+EXPERIENCE",  re.I),  8),
    (re.compile(r"WORK\s+EXPERIENCE",          re.I),  8),
    (re.compile(r"EXPERIENCE\s+IN\s+SAP",      re.I),  7),
    (re.compile(r"CAREER\s+HISTORY",           re.I),  7),
    (re.compile(r"EMPLOYMENT\s+HISTORY",       re.I),  7),
    (re.compile(r"ERFAHRUNG",                  re.I),  6),
    (re.compile(r"EXPERIENCE\s+SUMMARY",       re.I),  4),
    (re.compile(r"PROFESSIONAL.*SUMMARY",      re.I),  3),
    (re.compile(r"CAREER\s+OVERVIEW",          re.I),  3),
    (re.compile(r"CAREER\s+SUMMARY",           re.I),  2),
    (re.compile(r"EXECUTIVE\s+SUMMARY",        re.I),  2),
]

# Lines that look like bullet points
_BULLET_RE = re.compile(r"^[•\-\*·–►▪]\s+")

# Minimum length for a line to be considered a responsibility (filters headers/dates)
_MIN_RESPONSIBILITY_LEN = 15


def validate_experience(
    experience: list[dict[str, Any]],
    raw_text: str = "",
) -> list[dict[str, Any]]:
    """
    Validate and clean a list of experience entries returned by the LLM.

    Two passes:
    1. Remove entries with no anchor (no date AND no company/title).
    2. For anchored entries whose responsibilities list is empty, attempt local
       recovery: find the entry's anchor text in raw_text and extract the lines
       that follow it as responsibilities. This is immune to LLM deduplication.
    """
    if not experience:
        return experience

    structured = [e for e in experience if _entry_has_anchor(e)]
    bare = [e for e in experience if not _entry_has_anchor(e)]

    if bare:
        logger.info(
            "experience_validation_removed_bare_entries",
            extra={"removed": len(bare), "kept": len(structured)},
        )

    if not structured:
        logger.warning(
            "experience_validation_all_entries_bare",
            extra={"count": len(experience)},
        )
        return experience

    # Responsibilities recovery for entries the LLM returned with an empty list
    if raw_text:
        for entry in structured:
            if not entry.get("responsibilities"):
                recovered = _recover_responsibilities(entry, structured, raw_text)
                if recovered:
                    entry["responsibilities"] = recovered
                    logger.info(
                        "experience_responsibilities_recovered",
                        extra={
                            "job_title": entry.get("job_title"),
                            "company": entry.get("company"),
                            "lines_recovered": len(recovered),
                        },
                    )

    return structured


def score_section_name(section_name: str) -> int:
    """
    Return a priority score for a named experience section.
    Called externally when the caller knows which section produced which entries.
    """
    for pattern, weight in _SECTION_WEIGHTS:
        if pattern.search(section_name):
            return weight
    return 0


def _entry_has_anchor(entry: dict[str, Any]) -> bool:
    """
    An entry must have at least one identity anchor (date or company/title)
    to be considered a real experience record rather than a stray line.
    """
    has_date = bool(entry.get("start_date") or entry.get("end_date"))
    has_identity = bool(entry.get("company") or entry.get("job_title"))
    return has_date or has_identity


def _recover_responsibilities(
    entry: dict[str, Any],
    all_entries: list[dict[str, Any]],
    raw_text: str,
) -> list[str]:
    """
    Find the text block belonging to `entry` in raw_text and extract
    bullet-point or sentence lines as responsibilities.

    Strategy:
    - Use job_title or company as the anchor to locate the entry in raw_text.
    - Use the NEXT entry's anchor (or end of text) as the upper boundary.
    - Extract non-empty, non-header lines from that block.
    """
    anchor = (entry.get("job_title") or entry.get("company") or "").strip()
    if not anchor or len(anchor) < 3:
        return []

    text_lower = raw_text.lower()
    anchor_lower = anchor.lower()

    anchor_pos = text_lower.find(anchor_lower)
    if anchor_pos == -1:
        return []

    # Find the start of the next entry to define the end boundary
    end_pos = len(raw_text)
    for other in all_entries:
        if other is entry:
            continue
        other_anchor = (other.get("job_title") or other.get("company") or "").strip()
        if not other_anchor or len(other_anchor) < 3:
            continue
        pos = text_lower.find(other_anchor.lower(), anchor_pos + len(anchor_lower))
        if anchor_pos < pos < end_pos:
            end_pos = pos

    block = raw_text[anchor_pos:end_pos]
    lines = block.splitlines()

    responsibilities: list[str] = []
    for line in lines[1:]:  # skip the anchor line itself
        stripped = line.strip()
        if not stripped or len(stripped) < _MIN_RESPONSIBILITY_LEN:
            continue
        # Remove leading bullet markers
        cleaned = _BULLET_RE.sub("", stripped).strip()
        if not cleaned or cleaned.lower() == anchor_lower:
            continue
        responsibilities.append(cleaned)

    return responsibilities
