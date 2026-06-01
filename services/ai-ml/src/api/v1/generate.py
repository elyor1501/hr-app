from __future__ import annotations

import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.llm.gemini_llm_client import GeminiLLMClient

logger = logging.getLogger(__name__)
router = APIRouter(tags=["generate"])
llm = GeminiLLMClient()


# ── Request model ─────────────────────────────────────────────────────────────

class DeloitteParseRequest(BaseModel):
    cv_text: str
    candidate_id: Optional[str] = None
    candidate_location: Optional[str] = None   # from candidate.location in DB
    candidate_role: Optional[str] = None        # from candidate.current_title in DB


# ── Prompt template ───────────────────────────────────────────────────────────

_DELOITTE_PROMPT = """You are a professional resume formatter preparing content for a \
single-page Deloitte-format PowerPoint slide.

Generate concise, professional content for each slide section using the candidate \
information below. Every field has a strict character limit — never exceed it.

═══ SLIDE SECTIONS AND RULES ═══

name (string)
  Full candidate name. Max 40 chars.

role (string)
  Format exactly: "Role: <title>". Max 50 chars total.
  If a candidate_role_hint is provided in the data, use it verbatim.

location (string)
  Format exactly: "Location: <city, region>". Max 50 chars total.
  If a candidate_location_hint is provided in the data, use it verbatim.
  If not found anywhere, return "Location: NA".

summary_paras (array of exactly 2 strings)
  - Each paragraph: MINIMUM 380 characters, MAXIMUM 480 characters.
  - This is a HARD requirement, not a suggestion. Short paragraphs are unacceptable.
  - Para 1 (380–480 chars): years of experience, primary domain, role progression,
    industries worked in, education context.
  - Para 2 (380–480 chars): specific tools/platforms used, measurable achievements,
    secondary skills, certifications context, soft skills demonstrated.
  - For sparse CVs: expand on every detail provided — describe context, impact,
    scope, and depth rather than listing tersely. Never produce a short paragraph
    just because the source is concise.
  - CRITICAL: Use specific tool names, platforms, company names, and measurable figures
    directly from the CV. Do not replace specific terms with generic descriptions.
    Good: "leveraging Kubernetes, Terraform, and Ansible across AWS, Azure, and OpenStack"
    Bad: "leveraging infrastructure automation tools across multiple cloud platforms"
  - NEVER use generic filler text such as "A seasoned professional..."

relevant_exp_paras (array of exactly 3 strings — never fewer)
  - Each paragraph: MINIMUM 400 characters, MAXIMUM 500 characters.
  - This is a HARD requirement. Empty or short paragraphs are unacceptable.
  - Para 1 (starts "Experience includes"): describe past responsibilities, projects,
    and deliverables with specific tools, platforms, and metrics from the CV.
  - Para 2 (starts "Skilled in"): describe technical and methodological expertise
    with named technologies and concrete examples of application.
  - Para 3 (starts "Strong background in"): describe broader domain expertise,
    methodologies, and cross-functional capabilities.
  - For sparse CVs: synthesise from every detail available — expand on context,
    techniques applied, business impact, collaboration aspects, tools used.
    Each paragraph must independently stand at 400+ characters even if the CV is brief.
  - CRITICAL: Each paragraph must name specific tools, platforms, products, and figures
    from the CV. Do not generalise — use the exact terminology from the source material.
    Good: "Experience includes deploying MinIO S3 at 100+ petabyte scale with SSL/TLS
           hardening and Barbican key management across RHOPS 16.2 environments."
    Bad: "Experience includes designing and deploying large-scale object storage solutions
          with security-hardened configurations."

business_skills (array of 4–5 strings)
  Management, methodology, and interpersonal skills only.
  - Each item: max 35 chars.
  - Examples: Agile/Scrum, leadership, stakeholder management, project delivery.
  - Extract from the skills list or infer from experience.

tech_skill_groups (array of 3–6 pairs, each pair is [label, items_string])
  Technical skills grouped by category.
  - label: max 20 chars, describes the category (e.g. "CI/CD Tools").
  - items_string: max 45 chars, comma-separated tools in that category.
  - Group the provided skills list into logical technology categories.
  - Exclude business/soft skills from this section.

languages (array of 1–3 strings)
  Languages the candidate speaks. If not stated, return ["English"].

industry_experience (array of 1–4 strings)
  Industry sectors from experience. E.g. "Technology / Cloud Services".
  - Infer from company names and job descriptions.
  - Max 35 chars per item.

certifications (array of 0–3 strings)
  Professional certifications only.
  - Each: max 50 chars.
  - Return [] if none found. NEVER invent certifications.

education (array of 0–2 strings)
  Format: "Degree, Institution". Max 50 chars each.
  - Return [] if not provided. NEVER invent education.

clients (string)
  Comma-separated list of companies the candidate has worked at.
  - Max 120 chars total. Title-case each name.

═══ RULES ═══
- Never exceed character limits.
- Never invent information not present in the source data.
- Return [] for arrays and "" for strings when source data is absent.
- Return ONLY a single valid JSON object — no markdown, no explanation.

═══ JSON SCHEMA ═══
{{
  "name": "...",
  "role": "Role: ...",
  "location": "Location: ...",
  "summary_paras": ["...", "..."],
  "relevant_exp_paras": ["...", "...", "..."],
  "business_skills": ["...", "...", "...", "..."],
  "tech_skill_groups": [["CI/CD Tools", "Jenkins, GitLab, CircleCI"], ...],
  "languages": ["English"],
  "industry_experience": ["Technology / Cloud Services"],
  "certifications": [],
  "education": [],
  "clients": "Company A, Company B"
}}

═══ CANDIDATE DATA ═══
{candidate_data}"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_candidate_context(
    cv_text: str,
    candidate_location: str = "",
    candidate_role: str = "",
) -> str:
    context: dict = {"raw_cv_text": cv_text}
    if candidate_location:
        context["candidate_location_hint"] = candidate_location
    if candidate_role:
        context["candidate_role_hint"] = candidate_role
    return json.dumps(context, ensure_ascii=False, indent=2)


def _map_to_pptx_format(
    llm_data: dict,
    candidate_role: str = "",
    candidate_location: str = "",
) -> dict:
    """
    Map LLM response keys to the exact format _generate_pptx_bytes() expects
    in the backend. DB values (candidate_role, candidate_location) take priority
    over LLM-extracted values to ensure uniformity with the HR system.
    """
    name = llm_data.get("name") or ""

    # DB title is the primary source; LLM extraction is the fallback
    if candidate_role:
        role_raw = f"Role: {candidate_role}"
    else:
        role_raw = llm_data.get("role") or "Role: Consultant"

    # DB location is the primary source; LLM extraction falls back to NA
    if candidate_location:
        location_raw = f"Location: {candidate_location}"
    else:
        location_raw = llm_data.get("location") or "Location: NA"

    if not role_raw.startswith("Role:"):
        role_raw = f"Role: {role_raw}"
    if not location_raw.startswith("Location:"):
        location_raw = f"Location: {location_raw}"

    summary_paras = [p for p in llm_data.get("summary_paras", []) if p and p.strip()]
    relevant_exp_paras = [p for p in llm_data.get("relevant_exp_paras", []) if p and p.strip()]

    # Guarantee all three experience lines are always present
    while len(relevant_exp_paras) < 3:
        relevant_exp_paras.append("")

    # tech_skill_groups comes back as [[label, items], ...] — already correct format
    tech_skills = [
        pair for pair in llm_data.get("tech_skill_groups", [])
        if isinstance(pair, (list, tuple)) and len(pair) == 2
    ]

    return {
        "name_large": name,
        "name_card": name,
        "role": role_raw,
        "location": location_raw,
        "summary_paras": summary_paras,
        "business_skills": llm_data.get("business_skills", []),
        "tech_skills": tech_skills,
        "languages": llm_data.get("languages", ["English"]),
        "industry_experience": llm_data.get("industry_experience", []),
        "certifications": llm_data.get("certifications", []),
        "education": llm_data.get("education", []),
        "relevant_exp_paras": relevant_exp_paras,
        "clients": llm_data.get("clients", ""),
    }


# ── Endpoint ──────────────────────────────────────────────────────────────────

@router.post("/deloitte-parse")
async def generate_deloitte_content(payload: DeloitteParseRequest) -> dict:
    """
    Generate slide-ready content for the Deloitte-format PPTX template.

    Accepts raw CV text plus optional DB hints (role, location) and returns
    a dict whose keys map directly to the fields expected by the backend's
    _generate_pptx_bytes() function. One Gemini call; on failure the backend
    falls back to its regex parser.
    """
    logger.info(
        "deloitte_content_generation_start",
        extra={"candidate_id": payload.candidate_id},
    )

    candidate_context = _build_candidate_context(
        payload.cv_text,
        candidate_location=payload.candidate_location or "",
        candidate_role=payload.candidate_role or "",
    )
    prompt = _DELOITTE_PROMPT.format(candidate_data=candidate_context)

    llm_result = await llm.generate_json_async(prompt)

    if not isinstance(llm_result, dict) or not llm_result:
        logger.warning(
            "deloitte_llm_empty_response",
            extra={"candidate_id": payload.candidate_id},
        )
        raise HTTPException(
            status_code=500,
            detail="LLM returned empty response — backend should fall back to regex parser",
        )

    result = _map_to_pptx_format(
        llm_result,
        candidate_role=payload.candidate_role or "",
        candidate_location=payload.candidate_location or "",
    )

    logger.info(
        "deloitte_content_generation_complete",
        extra={
            "candidate_id": payload.candidate_id,
            "summary_paras": len(result["summary_paras"]),
            "exp_paras": len([p for p in result["relevant_exp_paras"] if p]),
            "business_skills": len(result["business_skills"]),
            "tech_skill_groups": len(result["tech_skills"]),
            "clients": result["clients"],
        },
    )

    return result
