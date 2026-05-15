from __future__ import annotations
import logging
from dataclasses import dataclass, field
from typing import Any

from .name_validator import validate_name
from .phone_validator import validate_phone
from .skills_validator import validate_skills
from .experience_selector import validate_experience

logger = logging.getLogger(__name__)

# Scalar string fields where None is replaced with "NA".
# List fields (skills, education, experience, etc.) are left as-is so that
# downstream consumers can distinguish "empty list" from "missing scalar".
_NA_FIELDS: frozenset[str] = frozenset({
    "full_name", "email", "phone", "location",
    "linkedin", "github", "portfolio", "summary",
})


@dataclass
class ValidationResult:
    data: dict[str, Any]
    warnings: list[str] = field(default_factory=list)
    # Per-field confidence adjustments applied by validation (-1.0 to 0.0)
    confidence_delta: dict[str, float] = field(default_factory=dict)


def validate_structured_cv(structured_dict: dict[str, Any], raw_text: str) -> ValidationResult:
    """
    Run all deterministic validation passes on a structured CV dict.

    Called after the LLM has returned data and before saving to the database.
    No LLM calls are made here; all decisions are rule-based.

    Returns a ValidationResult whose .data field is the corrected dict.
    """
    result = dict(structured_dict)
    warnings: list[str] = []
    confidence_delta: dict[str, float] = {}

    # ── 1. Name ───────────────────────────────────────────────────────────────
    original_name = result.get("full_name")
    result["full_name"] = validate_name(original_name, raw_text)
    if result["full_name"] == "NA" and original_name:
        warnings.append(f"name_rejected: {original_name!r}")
        confidence_delta["full_name"] = -0.5
    elif result["full_name"] != original_name and result["full_name"] != "NA":
        warnings.append(f"name_recovered_from_text: {result['full_name']!r}")

    # ── 2. Phone ──────────────────────────────────────────────────────────────
    result["phone"] = validate_phone(result.get("phone"), raw_text)

    # ── 3. Skills ─────────────────────────────────────────────────────────────
    result["skills"] = validate_skills(result.get("skills") or [], raw_text)

    # ── 4. Experience ─────────────────────────────────────────────────────────
    # raw_text is passed so the validator can recover missing responsibilities
    # by searching the source document directly (no LLM call).
    result["experience"] = validate_experience(result.get("experience") or [], raw_text)

    # ── 5. Null → "NA" for scalar string fields ───────────────────────────────
    for field_name in _NA_FIELDS:
        if result.get(field_name) is None:
            result[field_name] = "NA"

    # ── 6. Map rejected-name sentinel to "Unknown" ────────────────────────────
    # The backend worker skips candidate creation when first_name == "Unknown"
    # (worker.py:_auto_create_or_link_candidate). "NA" bypasses that guard,
    # causing INSERT attempts that timeout on the pgvector index under load.
    if result.get("full_name") == "NA":
        result["full_name"] = "Unknown"

    if warnings:
        logger.info(
            "cv_validation_corrections_applied",
            extra={"warnings": warnings, "confidence_delta": confidence_delta},
        )

    return ValidationResult(
        data=result,
        warnings=warnings,
        confidence_delta=confidence_delta,
    )
