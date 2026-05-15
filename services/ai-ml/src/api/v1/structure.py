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
from services.validation import validate_structured_cv

llm = GeminiLLMClient()

router = APIRouter(prefix="/structure", tags=["Structured Extraction"])
logger = logging.getLogger(__name__)


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
RESUME_PROMPT_TEMPLATE = """You are extracting structured data from a resume. Return ONLY valid JSON — no markdown, no code fences, no commentary.

═══ LAYOUT DETECTION — APPLY BEFORE EXTRACTING ANYTHING ═══

CVs use many different visual formats. The PDF-to-text conversion that produced this
text may have flattened a multi-column or table layout into a linear stream. Before
extracting any field, identify which layout pattern each section uses:

PATTERN A — TWO-COLUMN BLOCK (common in contact headers and skills tables):
  Left and right column content is interleaved line by line. Adjacent lines that
  are logically unrelated (e.g. a name on the left and a phone number on the right)
  will appear on the same or consecutive lines with no clear separator.
  Detection signal: short lines alternating between different types of information
  (name/title on one, phone/email on next, city/URL after that).
  Action: read ALL lines in such a block before deciding what each field is.

PATTERN B — TABLE ROW (common in experience and skills sections):
  A table row collapses into a single line or small group of lines where the
  logical columns are separated by large whitespace, tab characters, or a pipe/dash.
  Example (experience table):
    "2022 – 2024    Senior SAP Consultant    Accenture    Frankfurt"
  Example (skills table):
    "SAP Modules      FI  CO  MM  SD  WM  PP"
    "Programming      ABAP  Python  SQL  Java"
  Detection signal: repeated lines with the same number of whitespace-separated
  segments, or lines where the left part is a label and the right is a list.
  Action for experience rows: extract each row as one experience entry with
  whatever fields are present (date, title, company, location — any may be absent).
  Action for skills rows: extract ONLY the right-column values as individual skills;
  do NOT include the left-column category label as a skill.

PATTERN C — LABELED FIELDS (common in German CVs and structured templates):
  Each field is on its own line with a label prefix:
    "Rolle: Senior Berater"
    "Unternehmen: SAP SE"
    "Zeitraum: 03/2021 – 09/2023"
  Action: map each label to the appropriate output field.
  Accepted German labels → output field:
    Rolle / Position / Bezeichnung / Funktion → job_title
    Unternehmen / Arbeitgeber / Kunde / Firma → company
    Zeitraum / Dauer / Von–Bis / Laufzeit    → start_date + end_date
    Ort / Standort                            → location
    Aufgaben / Tätigkeiten / Beschreibung    → responsibilities

ANY SECTION can use ANY of these patterns independently. Do not assume the skills
section uses a specific layout just because the experience section does.

═══ FIELD EXTRACTION RULES ═══

FULL NAME:
  Extract the person's full name (first name + last name ± middle name/initial).
  The name may appear anywhere in the CV — at the top, after a photo placeholder,
  after a label, or embedded in a contact block.
  It may or may not be preceded by a label such as "Name:", "Vorname:", "Vor- und Nachname:".
  A person name: consists only of letters (including accented/umlauted characters),
  spaces, hyphens, apostrophes, or dots; has 1–5 words; contains no digits.
  Do NOT extract as the name:
    — Job titles or seniority levels ("Senior Consultant", "Lead Developer")
    — Availability text ("Verfügbar ab sofort", "Available from March 2024")
    — Section headings ("Curriculum Vitae", "Lebenslauf", "Profil")
    — Company names, locations, email addresses, or URLs
  If you cannot identify a clear person name with high confidence, return null.

PHONE:
  Include the country code whenever it is present (+49, +91, etc.).
  If the number appears without a country code, copy it exactly as written — do not
  fabricate a country code.
  If no phone is found, return null.

SKILLS:
  Extract every distinct technology, tool, framework, programming language,
  SAP module or transaction, database, cloud platform, API, protocol, or
  methodology that appears in ANY section of the CV.
  When the CV has a dedicated skills section (any heading containing "Skills",
  "Kenntnisse", "Kompetenzen", "Technology", "Technologie", or similar),
  extract ALL items from that section first, then supplement with skills found
  in experience bullet points.
  For two-column skills tables: extract ONLY the right-column (value) items —
  not the left-column category labels.
  Copy each skill EXACTLY as written in the source text — do not normalise,
  expand, abbreviate, or change spelling.
  Exclude: dates, city/country names, company names, project deliverable names
  ("BRD", "Test Plan", "Blueprint"), and generic soft skills
  ("Teamwork", "Communication", "Leadership").

EXPERIENCE:
  Extract every distinct work engagement, project, or role.
  When the CV has multiple work-related sections (e.g. both a summary table
  and a detailed project list), prefer the section with the most structured
  detail (date ranges + company + responsibilities). If entries from a summary
  section duplicate entries in the detailed section, extract ONLY the detailed ones.
  For each entry, extract whatever fields are present — some CVs omit certain
  fields (no company, no location, no explicit date). Set those to null; do not
  fabricate missing values.
  responsibilities: copy EVERY bullet point, task, and achievement VERBATIM as
  individual array items. Do NOT summarise, merge, or paraphrase.

═══ JSON SCHEMA ═══

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
      "technologies": [string],
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

LAYOUT — TWO-COLUMN SKILLS TABLES:
  This text may come from a table where the left column is a category label and
  the right column holds a comma- or space-separated list of tools.
  Example:
    "SAP Modules      FI  CO  MM  SD  WM"
    "Programming      ABAP  Python  SQL"
  Extract ONLY the right-column values as individual skills.
  Do NOT include the left-column label ("SAP Modules", "Programming") as a skill.
  Recognised section headings to search for skills (English and German):
    Technical Skills, IT Skills, Technology Summary, Tech Stack, Core Competencies,
    IT-Kenntnisse, EDV-Kenntnisse, Technische Kenntnisse, Kenntnisse,
    Kompetenzen, Fachkenntnisse, Qualifikationen, Technologie-Profil

What to INCLUDE:
  Technology names, tools, frameworks, programming languages, SAP modules and
  transactions, certifications, methodologies, cloud platforms, databases,
  APIs, protocols.

What to EXCLUDE — do not extract these even if they appear in a list:
  Dates or year strings (e.g. "2021", "Jan 2023", "06/2025–10/2025", "Stand 09 7")
  Status or date-stamp lines (e.g. "Stand: März 2024", "As of 2024", "Seit 2020")
  City, country, or region names (e.g. "Hessen", "Bayern", "India", "Bangalore")
  Client or company names (e.g. "Vodafone", "Accenture", "Kunde: IT Dienstleister")
  Project deliverable names (e.g. "BRDs", "Blueprint", "Solution Design", "Test Plan")
  Generic soft skills (e.g. "Teamwork", "Communication", "Leadership", "Analytical")
  Generic management phrases (e.g. "Team Management", "Client Management", "Resource Planning")
  Industry descriptions or company profiles

Copy each skill EXACTLY as written in the source text.
Do NOT normalise, expand, abbreviate, or change any spelling.
  "FIORI" stays "FIORI"              — do not change to "SAP Fiori"
  "S4HANA 2021" stays "S4HANA 2021"  — do not change to "SAP S/4HANA"
  "ABAP/4" stays "ABAP/4"

Acceptable item length: 1–6 words, 2–60 characters.
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

═══ LAYOUT DETECTION ═══

Entries may appear in any visual format. Detect the format from context before extracting:

FORMAT A — TABLE ROW:
  Each row is one experience entry. Columns may be separated by large whitespace,
  tabs, or pipe characters. The columns may represent: date range, job title,
  company, location — in any order. Example:
    "2022 – 2024    Senior Consultant    Accenture    Frankfurt"
    "03/2019–08/2022  SAP FI Lead         Deloitte      Munich"
  Extract each row as one entry. Set fields to null if a column is missing or
  cannot be determined — do not fabricate values.

FORMAT B — LABELED FIELDS:
  Each field on its own line with a label prefix (English or German). Example:
    "Rolle: Senior SAP Berater"
    "Unternehmen: SAP SE / Kunde: Volkswagen AG"
    "Zeitraum: 03/2021 – 09/2023"
    "Aufgaben: Customizing FI-GL, Durchführung von Workshops..."
  Accepted German label → output field mapping:
    Rolle / Position / Bezeichnung / Funktion / Titel → job_title
    Unternehmen / Arbeitgeber / Kunde / Firma / Client → company
    Zeitraum / Dauer / Von / Bis / Laufzeit            → start_date / end_date
    Ort / Standort / Location                          → location
    Aufgaben / Tätigkeiten / Beschreibung / Leistungen → responsibilities

FORMAT C — BULLET LIST OR FREE-FORM:
  Entries appear as blocks of bullets beneath a header line that names the role
  and/or company. The header may contain the date range as well.

FORMAT D — NUMBERED PROJECTS:
  "Project 10: ClientName" or "Projekt 3: Aufgabe – Rolle"
  Treat each numbered project as one entry.

═══ EXTRACTION RULES ═══

Return ONE entry per PROJECT or ENGAGEMENT — not one per employer.
If an employer has multiple separate projects, return each as its own entry.

When the CV has BOTH a brief summary table AND a detailed project section:
  Extract ONLY from the detailed section. Omit entries that duplicate
  information already covered in more detail by another entry.

For each entry, extract whatever fields are present in the source:
  job_title       — most specific role or position title; null if not stated
  company         — employer or client organisation name; null if not stated
  location        — city or country; null if not stated
  start_date      — copy EXACTLY as written in the CV; null if not stated
  end_date        — copy EXACTLY as written in the CV; null if not stated
  responsibilities — copy EVERY bullet point, task, duty, achievement, and
                     project detail VERBATIM as individual array items.
                     Do NOT summarise, merge, paraphrase, or omit any item.
                     Each bullet or sentence = one separate string in the array.

Do NOT fabricate or infer any field that is not explicitly present in the text.

Return ONLY valid JSON, no markdown, no code blocks:
{{"experience": [{{"job_title": "string or null", "company": "string or null", "location": "string or null", "start_date": "string or null", "end_date": "string or null", "responsibilities": ["string"]}}]}}

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


async def _llm_primary_structure(resume_id: str, raw_text: str) -> dict:
    """
    LLM-first structuring. One Gemini call extracts skills, experience, education,
    projects, certifications, summary, and location. Local regex still wins on
    full_name, email, and phone when it finds them; the LLM values fill in only
    when regex came up empty for those three fields. On hard LLM failure
    (exception, empty response after retry) falls back to _local_structure so
    we never produce a fully blank candidate.
    """
    t0 = time.time()

    # Regex pass for contact fields only. sections={} skips the section detector
    # so this call returns fast and doesn't make any LLM calls of its own.
    regex_name: str | None = None
    regex_email: str | None = None
    regex_phone: str | None = None
    try:
        regex_result = parse_cv(raw_text, sections={})
        regex_name = regex_result.full_name
        regex_email = regex_result.email
        regex_phone = regex_result.phone
    except Exception as exc:
        logger.warning("regex_contact_parse_failed: %s", exc)

    try:
        prompt = RESUME_PROMPT_TEMPLATE.format(raw_text=raw_text)
        llm_result = await llm.generate_json_async(prompt)
        if not isinstance(llm_result, dict) or not llm_result:
            raise RuntimeError("LLM returned empty structured data")
        merged = StructuredData(**llm_result)
    except Exception as exc:
        logger.warning(
            "llm_primary_failed_using_local_fallback",
            extra={"resume_id": resume_id, "error": str(exc)},
        )
        return await _local_structure(resume_id, raw_text)

    # Serialise the validated model to a dict ONCE here. Subsequent overrides
    # operate on this dict directly so we never re-enter StructuredData's
    # `mode="before"` validators (which drop ExperienceItem/EducationItem
    # instances because they're neither dicts nor strings).
    structured_dict = merged.model_dump()

    # Targeted-fallback retries for the two fields most often missed by the broad
    # JSON-schema prompt. These use aggressive single-purpose prompts. They only
    # fire when the main call returned empty AND the CV body looks substantial,
    # so cost stays bounded.
    raw_text_substantial = bool(raw_text and len(raw_text.strip()) >= 200)
    needs_exp_retry = raw_text_substantial and not structured_dict.get("experience")
    needs_edu_retry = raw_text_substantial and not structured_dict.get("education")

    if needs_exp_retry or needs_edu_retry:
        logger.info(
            "llm_primary_targeted_retry",
            extra={
                "resume_id": resume_id,
                "retry_experience": needs_exp_retry,
                "retry_education":  needs_edu_retry,
                "llm_keys_returned": sorted(list(llm_result.keys())),
            },
        )
        retry_tasks = [
            _llm_extract_experience(raw_text) if needs_exp_retry else _noop(),
            _llm_extract_education(raw_text)  if needs_edu_retry  else _noop(),
        ]
        retry_results = await asyncio.gather(*retry_tasks, return_exceptions=True)
        retry_exp, retry_edu = retry_results

        if needs_exp_retry and isinstance(retry_exp, list) and retry_exp:
            structured_dict["experience"] = retry_exp
            logger.info("llm_primary_experience_recovered",
                        extra={"resume_id": resume_id, "entries": len(retry_exp)})
        if needs_edu_retry and isinstance(retry_edu, list) and retry_edu:
            structured_dict["education"] = retry_edu
            logger.info("llm_primary_education_recovered",
                        extra={"resume_id": resume_id, "entries": len(retry_edu)})

    # Apply regex-preferred contact overrides. Regex wins where it found something;
    # the LLM value (already in structured_dict) stays where regex came up empty.
    if regex_name:
        structured_dict["full_name"] = regex_name
    if regex_email:
        structured_dict["email"] = regex_email
    if regex_phone:
        structured_dict["phone"] = regex_phone

    if not structured_dict.get("confidence_score"):
        structured_dict["confidence_score"] = 0.88
    structured_dict["extraction_latency"] = round(time.time() - t0, 3)

    # Deterministic local validation: rejects invalid names/phones, filters
    # garbage skills, removes bare experience entries, and normalises None → "NA".
    validation = validate_structured_cv(structured_dict, raw_text)
    structured_dict = validation.data
    if validation.warnings:
        logger.warning(
            "cv_validation_corrections",
            extra={"resume_id": resume_id, "corrections": validation.warnings},
        )

    cv_cost = llm.consume_session_cost()
    logger.info("llm_primary_structure_complete", extra={
        "resume_id":          resume_id,
        "skills_found":       len(structured_dict.get("skills") or []),
        "experience_entries": len(structured_dict.get("experience") or []),
        "education_entries":  len(structured_dict.get("education") or []),
        "input_tokens":       cv_cost["input_tokens"],
        "output_tokens":      cv_cost["output_tokens"],
        "cost_usd":           cv_cost["total_cost_usd"],
    })

    return {
        "source_file": resume_id,
        "structured_data": structured_dict,
        "_pipeline_info": {
            "llm_path": "llm_primary",
            "input_tokens":  cv_cost["input_tokens"],
            "output_tokens": cv_cost["output_tokens"],
            "cost_usd":      cv_cost["total_cost_usd"],
            "regex_caught": {
                "full_name": bool(regex_name),
                "email":     bool(regex_email),
                "phone":     bool(regex_phone),
            },
        },
    }


async def _structure_one(resume_id: str, raw_text: str) -> dict:
    return await _llm_primary_structure(resume_id, raw_text)


@router.post("")
async def structure_resume(payload: StructureRequest):
    logger.info("structuring_resume", extra={"resume_id": payload.resume_id})
    try:
        return await _llm_primary_structure(payload.resume_id, payload.raw_text)
    except Exception as e:
        error_details = traceback.format_exc()
        logger.error("structure_failed", extra={"resume_id": payload.resume_id, "error": str(e), "traceback": error_details})
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