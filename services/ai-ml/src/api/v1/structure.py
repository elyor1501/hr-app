import os
import time
import traceback
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional, Union
from services.llm.gemini_llm_client import GeminiLLMClient
from services.parsers import parse_cv, detect_sections_llm_first

llm = GeminiLLMClient()

router = APIRouter(prefix="/structure", tags=["Structured Extraction"])
logger = logging.getLogger(__name__)


def _use_local_parser() -> bool:
    return os.getenv("USE_LOCAL_PARSER", "false").lower() == "true"


class StructureRequest(BaseModel):
    resume_id: str
    raw_text: str = Field(..., min_length=1)


class BatchStructureItem(BaseModel):
    resume_id: str
    raw_text: str = Field(..., min_length=1)


class BatchStructureRequest(BaseModel):
    resumes: List[BatchStructureItem] = Field(..., min_length=1, max_length=10)


class EducationItem(BaseModel):
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None
    confidence: Optional[float] = 0.8


class ExperienceItem(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: List[str] = []
    confidence: Optional[float] = 0.8


class ConfidenceScores(BaseModel):
    full_name: Optional[float] = 0.8
    email: Optional[float] = 0.8
    phone: Optional[float] = 0.8
    location: Optional[float] = 0.8
    skills: Optional[float] = 0.8
    education: Optional[float] = 0.8
    experience: Optional[float] = 0.8
    projects: Optional[float] = 0.8
    overall: Optional[float] = 0.8


class StructuredData(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    education: List[EducationItem] = []
    experience: List[ExperienceItem] = []
    projects: List[Union[Dict[str, Any], str]] = []
    certifications: List[Union[Dict[str, Any], str]] = []
    confidence_scores: Optional[ConfidenceScores] = ConfidenceScores()
    confidence_score: Optional[float] = 0.8
    extraction_latency: Optional[float] = 0.0

    @field_validator("projects", mode="before")
    @classmethod
    def normalize_projects(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"name": item.strip()})
        return result

    @field_validator("certifications", mode="before")
    @classmethod
    def normalize_certifications(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"name": item.strip()})
        return result

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [str(s).strip() for s in v if s]

    @field_validator("education", mode="before")
    @classmethod
    def normalize_education(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"institution": item.strip()})
        return result

    @field_validator("experience", mode="before")
    @classmethod
    def normalize_experience(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"job_title": item.strip()})
        return result


# Nested types must be fully defined in the schema; empty arrays cause the model to return empty arrays verbatim
RESUME_PROMPT_TEMPLATE = """Extract structured resume data in JSON format strictly adhering to the following structure. Return ONLY valid JSON, no markdown.

{{
  "full_name": string or null,
  "email": string or null,
  "phone": string or null,
  "location": string or null,
  "linkedin": string or null,
  "github": string or null,
  "portfolio": string or null,
  "summary": string or null,
  "skills": [string],
  "education": [
    {{
      "degree": string or null,
      "field_of_study": string or null,
      "institution": string or null,
      "start_date": string or null,
      "end_date": string or null,
      "grade": string or null,
      "confidence": float
    }}
  ],
  "experience": [
    {{
      "job_title": string or null,
      "company": string or null,
      "location": string or null,
      "start_date": string or null,
      "end_date": string or null,
      "responsibilities": [string],
      "confidence": float
    }}
  ],
  "projects": [
  {{
  "name": string or null,
  "description": string or null,
  "technologies":[string],
  "url": string or null
  }}
  ],
  "confidence_scores": {{
    "full_name": float,
    "email": float,
    "phone": float,
    "location": float,
    "skills": float,
    "education": float,
    "experience": float,
    "projects": float,
    "overall": float
  }},
  "confidence_score": float,
  "extraction_latency": 0.0
}}

Resume Text:
{raw_text}"""


_SKILL_EXTRACTION_PROMPT = """Extract all technical skill names from the resume text below.
Already found: {existing_skills}
Return ONLY items NOT in the above list.

What to INCLUDE:
  Technology names, tools, frameworks, programming languages, SAP modules and transactions,
  certifications, methodologies, cloud platforms, databases, APIs, protocols.

What to EXCLUDE — do not extract these even if they appear in a list:
  Dates or year strings (e.g. "2021", "Jan 2023", "06/2025-10/2025")
  City, country, or region names (e.g. "Hessen", "Bayern", "India", "Bangalore")
  Client or company names (e.g. "Vodafone", "Accenture", "Kunde: IT Dienstleister")
  OS/GUI environment strings listed as deployment platforms (e.g. "Windows8", "Windows10", "SAP GUI")
  Project deliverable names (e.g. "BRDs", "Blueprint", "Solution Design", "Test Plan")
  Generic management activities (e.g. "Team Management", "Client Management", "Resource Planning")
  Industry descriptions or company profiles

Copy each skill EXACTLY as written in the source text.
Do NOT normalise, expand, abbreviate, or change any spelling.
  "FIORI" stays "FIORI"              — do not change to "SAP Fiori"
  "S4HANA 2021" stays "S4HANA 2021"  — do not change to "SAP S/4HANA"
  "ABAP/4" stays "ABAP/4"

Acceptable item length: 1–6 words.
Return ONLY valid JSON: {{"skills": ["skill1", "skill2"]}}

Text:
{section_text}"""

_EDUCATION_EXTRACTION_PROMPT = """Extract education history from the resume text below.
Return ONLY valid JSON in this exact format:
{{"education": [{{"degree": string or null, "field_of_study": string or null, "institution": string or null, "start_date": string or null, "end_date": string or null, "grade": string or null}}]}}
Rules: only explicitly stated education — do not infer. Return empty list if none found.

Text:
{raw_text}"""

_EXPERIENCE_EXTRACTION_PROMPT = """Extract every work experience entry from the resume text below.

Entries may appear in ANY format: bullet lists, labeled fields (Role:, Organization:,
Duration:, Responsibilities:), numbered projects ("Project 10: Apple"), table summaries,
or free-form paragraphs.

Return ONE entry per PROJECT or ENGAGEMENT — not one per employer.
If an employer has multiple separate projects, return each project as its own entry.

If the same role information appears both as a brief one-line summary AND as a detailed
block with responsibilities listed beneath it, extract ONLY from the detailed block.

For each entry:
  job_title       — the most specific role or position title for that project
  company         — the employer or client organisation name
  start_date      — copy exactly as written in the CV; null if not stated
  end_date        — copy exactly as written in the CV; null if not stated
  responsibilities — copy EVERY bullet point, duty, task, project detail, and achievement
                     VERBATIM as individual array items.
                     Do NOT summarise, merge, paraphrase, or omit any item.
                     Each bullet point or sentence = one separate string in the array.

Return ONLY valid JSON, no markdown, no code blocks:
{{"experience": [{{"job_title": "string or null", "company": "string or null", "start_date": "string or null", "end_date": "string or null", "responsibilities": ["string"]}}]}}

Return {{"experience": []}} if no experience found.

Resume text:
{raw_text}"""


async def _llm_extract_skills(section_text: str, existing: list[str] | None = None) -> list[str]:
    """Targeted Gemini call — always supplements local parser output with missing skills."""
    try:
        existing_str = ", ".join(existing) if existing else "none"
        prompt = _SKILL_EXTRACTION_PROMPT.format(
            section_text=section_text,
            existing_skills=existing_str,
        )
        result = await llm.generate_json_async(prompt)
        if isinstance(result, dict):
            skills = result.get("skills", [])
            if isinstance(skills, list):
                return [str(s).strip() for s in skills if s and len(str(s).strip()) <= 60]
    except Exception as exc:
        logger.warning("llm_skill_fallback_failed: %s", exc)
    return []


async def _llm_extract_education(raw_text: str) -> list[dict]:
    """Targeted Gemini call for education — always runs since local parser never extracts it."""
    try:
        # Education is typically at the tail of a CV, after years of experience
        education_context = raw_text[-3000:] if len(raw_text) > 3000 else raw_text
        prompt = _EDUCATION_EXTRACTION_PROMPT.format(raw_text=education_context)
        result = await llm.generate_json_async(prompt)
        if isinstance(result, dict):
            edu = result.get("education", [])
            if isinstance(edu, list):
                return [e for e in edu if isinstance(e, dict)]
    except Exception as exc:
        logger.warning("llm_education_fallback_failed: %s", exc)
    return []


async def _llm_extract_experience(raw_text: str) -> list[dict]:
    """Targeted Gemini call for experience — full section text, no truncation."""
    try:
        prompt = _EXPERIENCE_EXTRACTION_PROMPT.format(raw_text=raw_text)
        logger.info(f"Experience Prompt: {prompt}")
        result = await llm.generate_json_async(prompt)
        logger.info(f"Gemini Output: {result}")
        if isinstance(result, dict):
            exp = result.get("experience", [])
            if isinstance(exp, list):
                return [e for e in exp if isinstance(e, dict)]
    except Exception as exc:
        logger.warning("llm_experience_fallback_failed: %s", exc)
    return []


def _skills_are_low_quality(skills: list[str]) -> bool:
    """
    True when extracted skills look like sentence fragments.
    Signals LLM fallback: avg > 3 words per item OR any item > 45 chars OR count < 4.
    """
    if not skills:
        return True
    if len(skills) < 4:
        return True
    avg_words = sum(len(s.split()) for s in skills) / len(skills)
    if avg_words > 3.0:
        return True
    if any(len(s) > 45 for s in skills):
        return True
    return False


def _compute_quality_deficit(result, skills: list[str]) -> int:
    """
    Score indicating how much the local parser failed.
    Drives the decision of whether to run a full LLM call or targeted fallbacks.
    """
    deficit = 0
    if not result.full_name:
        deficit += 2
    if len(result.experiences) < 2:
        deficit += 2
    if len(skills) < 5:
        deficit += 1
    if _skills_are_low_quality(skills):
        deficit += 1
    return deficit


async def _local_structure(resume_id: str, raw_text: str) -> dict:
    t0 = time.time()
    # Section boundaries are resolved via Gemini first; the regex detector is the
    # transparent fallback inside detect_sections_llm_first when the LLM call fails.
    sections = await detect_sections_llm_first(raw_text, llm)
    result = parse_cv(raw_text, sections=sections)
    skills = [s.value for s in result.skills]
    experiences = list(result.experiences)

    deficit = _compute_quality_deficit(result, skills)

    logger.info("local_parse_complete", extra={
        "resume_id": resume_id,
        "skills_found": len(skills),
        "experience_entries": len(experiences),
        "deficit": deficit,
    })

    if deficit >= 3:
        # Too many fields are poor quality — one full LLM call is more efficient
        # than multiple targeted calls and covers all fields including education.
        logger.info("llm_full_escalation_triggered", extra={"resume_id": resume_id, "deficit": deficit})
        try:
            prompt = RESUME_PROMPT_TEMPLATE.format(raw_text=raw_text)
            llm_result = await llm.generate_json_async(prompt)
            if isinstance(llm_result, dict) and llm_result:
                merged = StructuredData(**llm_result)
                # Prefer local regex results for contact fields — they are more reliable
                candidate_data = StructuredData(
                    full_name=result.full_name or merged.full_name,
                    email=result.email or merged.email,
                    phone=result.phone or merged.phone,
                    location=merged.location,
                    linkedin=merged.linkedin,
                    github=merged.github,
                    portfolio=merged.portfolio,
                    summary=merged.summary or result.raw_sections.get("summary"),
                    skills=merged.skills or skills,
                    education=merged.education,
                    experience=merged.experience if merged.experience else experiences,
                    projects=merged.projects,
                    certifications=merged.certifications,
                    confidence_score=0.88,
                    extraction_latency=round(time.time() - t0, 3),
                )
                logger.info("llm_full_escalation_complete", extra={"resume_id": resume_id})
                cv_cost = llm.consume_session_cost()
                logger.info("cv_llm_cost", extra={
                    "resume_id":      resume_id,
                    "input_tokens":   cv_cost["input_tokens"],
                    "output_tokens":  cv_cost["output_tokens"],
                    "cost_usd":       cv_cost["total_cost_usd"],
                    "path":           "full_escalation",
                })
                esc_resp = {"source_file": resume_id, "structured_data": candidate_data.model_dump()}
                esc_resp["_pipeline_info"] = {
                    "deficit": deficit,
                    "llm_path": "full_escalation",
                    "llm_calls": {"full": {"source": "entire_cv", "char_count": len(raw_text)}},
                    "input_tokens": cv_cost["input_tokens"],
                    "output_tokens": cv_cost["output_tokens"],
                    "cost_usd": cv_cost["total_cost_usd"],
                }
                return esc_resp
        except Exception as exc:
            logger.warning("llm_full_escalation_failed: %s — using local result", exc)

    # Targeted fallbacks run in parallel for efficiency
    fallback_tasks = []
    needs_skill_fallback = True  # LLM always supplements local parser output
    needs_exp_fallback = True  # LLM always extracts experience for verbatim responsibilities

    if needs_skill_fallback:
        if not result.skills_raw_text:
            logger.info("no_skills_section_detected", extra={"resume_id": resume_id})
        logger.info("llm_skill_fallback_triggered", extra={"resume_id": resume_id})
        # Skills may appear anywhere in the document — first-N chars misses late-appearing tables
        skills_source = result.skills_raw_text or raw_text
        fallback_tasks.append(_llm_extract_skills(skills_source, existing=skills))
    else:
        fallback_tasks.append(None)

    if needs_exp_fallback:
        logger.info("llm_experience_fallback_triggered", extra={"resume_id": resume_id})
        logger.info(f"Experience Raw Text : {result.experience_raw_text or raw_text}")
        fallback_tasks.append(_llm_extract_experience(result.experience_raw_text or raw_text))
    else:
        fallback_tasks.append(None)

    # Education is always fetched via LLM — no local parser exists for it
    fallback_tasks.append(_llm_extract_education(raw_text))

    results = await asyncio.gather(
        *[t if t is not None else _noop() for t in fallback_tasks],
        return_exceptions=True,
    )

    llm_skills_result, llm_exp_result, llm_edu_result = results

    # Merge skills
    if needs_skill_fallback and isinstance(llm_skills_result, list):
        clean_local = [s for s in skills if len(s.split()) <= 3]
        merged_lower = {s.lower() for s in clean_local}
        for s in llm_skills_result:
            if s.lower() not in merged_lower:
                clean_local.append(s)
                merged_lower.add(s.lower())
        skills = clean_local

    # Merge experience
    if needs_exp_fallback and isinstance(llm_exp_result, list) and llm_exp_result:
        experiences = llm_exp_result
    logger.info("debug_exp_result", extra={
        "resume_id": resume_id,
        "entry_count": len(experiences),
        "resp_counts": [len(e.get("responsibilities", [])) for e in experiences],
    })

    # Merge education
    education: list = []
    if isinstance(llm_edu_result, list):
        education = llm_edu_result

    has_skills = len(skills) > 0
    latency = round(time.time() - t0, 3)

    candidate_data = StructuredData(
        full_name=result.full_name,
        email=result.email,
        phone=result.phone,
        summary=result.raw_sections.get("summary"),
        skills=skills,
        education=education,
        experience=experiences,
        confidence_scores=ConfidenceScores(
            full_name=0.85 if result.full_name else 0.0,
            email=0.95 if result.email else 0.0,
            phone=0.95 if result.phone else 0.0,
            skills=0.90 if has_skills else 0.0,
            education=0.88 if education else 0.0,
            experience=0.85 if experiences else 0.0,
            overall=0.85 if (has_skills and experiences) else 0.5,
        ),
        confidence_score=0.85 if (has_skills and experiences) else 0.5,
        extraction_latency=latency,
    )
    cv_cost = llm.consume_session_cost()
    targeted_calls = sum([needs_skill_fallback, needs_exp_fallback, True])  # education always runs
    logger.info("local_structure_complete", extra={
        "resume_id":         resume_id,
        "skills_found":      len(skills),
        "experience_entries": len(experiences),
        "education_entries": len(education),
        "latency_s":         latency,
    })
    logger.info("cv_llm_cost", extra={
        "resume_id":      resume_id,
        "input_tokens":   cv_cost["input_tokens"],
        "output_tokens":  cv_cost["output_tokens"],
        "cost_usd":       cv_cost["total_cost_usd"],
        "llm_calls":      targeted_calls,
        "path":           "targeted",
    })
    response = {"source_file": resume_id, "structured_data": candidate_data.model_dump()}
    if result.skills_raw_text:
        response["skills_raw_text"] = result.skills_raw_text
    if result.experience_raw_text:
        response["experience_raw_text"] = result.experience_raw_text
    response["_pipeline_info"] = {
        "deficit": deficit,
        "llm_path": "targeted",
        "llm_calls": {
            "skills": {
                "called": needs_skill_fallback,
                "source": ("skills_section" if result.skills_raw_text else "full_text_3000")
                          if needs_skill_fallback else None,
            },
            "experience": {
                "called": needs_exp_fallback,
                "source": ("experience_section" if result.experience_raw_text else "full_text")
                          if needs_exp_fallback else None,
            },
            "education": {
                "called": True,
                "source": "tail_text_3000",
            },
        },
        "input_tokens": cv_cost["input_tokens"],
        "output_tokens": cv_cost["output_tokens"],
        "cost_usd": cv_cost["total_cost_usd"],
    }
    return response


async def _noop():
    """Placeholder coroutine for parallel gather slots that have no work."""
    return None


async def _structure_one(resume_id: str, raw_text: str) -> dict:
    if _use_local_parser():
        return await _local_structure(resume_id, raw_text)
    prompt = RESUME_PROMPT_TEMPLATE.format(raw_text=raw_text)
    try:
        structured = await llm.generate_json_async(prompt)
        if not isinstance(structured, dict):
            structured = {}
        candidate_data = StructuredData(**structured)
        logger.info("structured_resume", extra={"resume_id": resume_id})
        return {
            "source_file": resume_id,
            "structured_data": candidate_data.model_dump(),
        }
    except Exception as e:
        logger.error("structure_one_failed", extra={"resume_id": resume_id, "error": str(e), "error_type": type(e).__name__})
        return {
            "source_file": resume_id,
            "structured_data": StructuredData().model_dump(),
        }


@router.post("")
async def structure_resume(payload: StructureRequest):
    if _use_local_parser():
        return await _local_structure(payload.resume_id, payload.raw_text)
    try:
        prompt = RESUME_PROMPT_TEMPLATE.format(raw_text=payload.raw_text)
        logger.info("structuring_resume", extra={"resume_id": payload.resume_id})
        structured = await llm.generate_json_async(prompt)
        if not isinstance(structured, dict):
            structured = {}
        candidate_data = StructuredData(**structured)
        logger.info("structured_resume_complete", extra={"resume_id": payload.resume_id})
        return {
            "source_file": payload.resume_id,
            "structured_data": candidate_data.model_dump(),
        }
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error("structure_failed", extra={"resume_id": payload.resume_id, "error": str(e), "traceback": error_details})
        try:
            return {
                "source_file": payload.resume_id,
                "structured_data": StructuredData().model_dump(),
            }
        except Exception:
            raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")


@router.post("/batch")
async def structure_resume_batch(payload: BatchStructureRequest):
    try:
        logger.info("batch_structuring_start", extra={"count": len(payload.resumes)})

        tasks = [
            _structure_one(r.resume_id, r.raw_text)
            for r in payload.resumes
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        output = []
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                resume_id = payload.resumes[i].resume_id
                logger.error("batch_item_failed", extra={"resume_id": resume_id, "error": str(result), "error_type": type(result).__name__})
                output.append({
                    "source_file": resume_id,
                    "structured_data": StructuredData().model_dump(),
                })
            else:
                output.append(result)

        logger.info("batch_structuring_complete", extra={"total": len(output)})
        return {"results": output}

    except Exception as e:
        error_details = traceback.format_exc()
        logger.error("batch_structure_endpoint_failed", extra={"error": str(e), "error_type": type(e).__name__, "traceback": error_details})
        raise HTTPException(status_code=500, detail=f"Batch AI Error: {str(e)}")