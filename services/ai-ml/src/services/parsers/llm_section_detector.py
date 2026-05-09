from __future__ import annotations
import logging
from typing import Any

from .section_detector import detect_sections

logger = logging.getLogger(__name__)

_VALID_KEYS: frozenset[str] = frozenset({
    "summary", "skills", "experience", "education", "projects", "certifications",
})

_PROMPT_TEMPLATE = """You are a resume parsing assistant. Identify the major sections of the resume
text below and return their content.

Recognised section types:
- summary       — career overview, professional profile, objective, "about me"
- skills        — any block listing technical or functional capabilities,
                  expertise, tools, technologies, methods, or competencies
- experience    — work history, employment, professional engagements, role
                  blocks with employers and date ranges
- education     — academic qualifications, degrees, schools, training programmes
- projects      — standalone project listings, only when clearly separate
                  from experience entries
- certifications — certifications, licences, accreditations, awards

Instructions:
- Classify each block by its MEANING and CONTEXT, not by exact heading wording.
  Headings may appear in any language, casing, punctuation, or format
  (with or without colons, numbered, bulleted, decorated, abbreviated, or
  stylised) — recognise them by intent.
- Copy each section's content VERBATIM from the source — do not summarise,
  paraphrase, reorder, reword, or fix typos.
- Exclude the heading line itself from the section content.
- Include all inner content (sub-headings, labelled fields, bullet points,
  table rows, numbered items) as part of the parent section's text. Sub-section
  labels inside a section belong to that section, not as a new section.
- If a heading does not clearly map to one of the recognised section types,
  attach its content to the most semantically appropriate type.
- If a section type is absent from the resume, omit that key entirely.
- If multiple distinct blocks belong to the same section type, concatenate
  their contents in the order they appear, separated by a blank line.

Return ONLY valid JSON, no markdown, no commentary:
{{"summary": "string", "skills": "string", "experience": "string",
 "education": "string", "projects": "string", "certifications": "string"}}

Resume text:
{raw_text}"""


def _coerce_sections(payload: Any) -> dict[str, str]:
    if not isinstance(payload, dict):
        return {}
    result: dict[str, str] = {}
    for key, value in payload.items():
        if key not in _VALID_KEYS:
            continue
        if not isinstance(value, str):
            continue
        text = value.strip()
        if text:
            result[key] = text
    return result


async def detect_sections_llm_first(text: str, llm_client) -> dict[str, str]:
    """
    Identify resume sections via Gemini; fall back to the regex detector on any failure.

    Mirrors the return shape of services.parsers.section_detector.detect_sections so
    downstream parsers consume sections without knowing which detector produced them.
    """
    if not text or not text.strip():
        return {}

    try:
        prompt = _PROMPT_TEMPLATE.format(raw_text=text)
        raw = await llm_client.generate_json_async(prompt)
        sections = _coerce_sections(raw)
        if sections:
            logger.info(
                "llm_section_detection_complete",
                extra={"section_count": len(sections), "keys": sorted(sections.keys())},
            )
            return sections
        logger.warning("llm_section_detection_empty: falling back to regex detector")
    except Exception as exc:
        logger.warning("llm_section_detection_failed: %s — falling back to regex", exc)

    return detect_sections(text)
