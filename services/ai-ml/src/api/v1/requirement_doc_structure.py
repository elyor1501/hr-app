import traceback
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional, Union
from services.llm.gemini_llm_client import GeminiLLMClient

llm = GeminiLLMClient()

router = APIRouter(prefix="/structure-requirement", tags=["Requirement Doc Extraction"])
logger = logging.getLogger(__name__)


class RequirementStructureRequest(BaseModel):
    doc_id: str
    raw_text: str = Field(..., min_length=1)


class QualificationItem(BaseModel):
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    is_required: Optional[bool] = True


class RequirementStructuredData(BaseModel):
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    department: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    experience_required: Optional[str] = None
    salary_range: Optional[str] = None
    summary: Optional[str] = None
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    responsibilities: List[str] = []
    qualifications: List[QualificationItem] = []
    certifications_required: List[str] = []
    tools_and_technologies: List[str] = []
    soft_skills: List[str] = []
    benefits: List[str] = []
    application_deadline: Optional[str] = None
    openings: Optional[int] = None
    hiring_manager: Optional[str] = None
    interview_process: List[str] = []
    confidence_score: Optional[float] = 0.8
    extraction_latency: Optional[float] = 0.0

    @field_validator("required_skills", "preferred_skills", "tools_and_technologies", "soft_skills", "certifications_required", "benefits", "responsibilities", "interview_process", mode="before")
    @classmethod
    def normalize_string_list(cls, v):
        if not isinstance(v, list):
            return []
        return [str(s).strip() for s in v if s]

    @field_validator("qualifications", mode="before")
    @classmethod
    def normalize_qualifications(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"degree": item.strip(), "field_of_study": None, "is_required": True})
        return result

    @field_validator("openings", mode="before")
    @classmethod
    def normalize_openings(cls, v):
        if v is None:
            return None
        try:
            return int(v)
        except Exception:
            return None

    @field_validator("employment_type", mode="before")
    @classmethod
    def normalize_employment_type(cls, v):
        if not v:
            return None
        allowed = ["full-time", "part-time", "contract", "freelance", "internship"]
        normalized = str(v).lower().strip()
        return normalized if normalized in allowed else None

    @field_validator("work_mode", mode="before")
    @classmethod
    def normalize_work_mode(cls, v):
        if not v:
            return None
        allowed = ["remote", "onsite", "hybrid"]
        normalized = str(v).lower().strip()
        return normalized if normalized in allowed else None


@router.post("")
async def structure_requirement_doc(payload: RequirementStructureRequest):
    try:
        prompt = f"""
Extract structured job requirement data in JSON format strictly adhering to the following structure. Return ONLY valid JSON, no markdown.

{{
  "job_title": string or null,
  "company_name": string or null,
  "department": string or null,
  "location": string or null,
  "employment_type": string or null,
  "work_mode": string or null,
  "experience_required": string or null,
  "salary_range": string or null,
  "summary": string or null,
  "required_skills": [string],
  "preferred_skills": [string],
  "responsibilities": [string],
  "qualifications": [
    {{
      "degree": string or null,
      "field_of_study": string or null,
      "is_required": boolean
    }}
  ],
  "certifications_required": [string],
  "tools_and_technologies": [string],
  "soft_skills": [string],
  "benefits": [string],
  "application_deadline": string or null,
  "openings": integer or null,
  "hiring_manager": string or null,
  "interview_process": [string],
  "confidence_score": float,
  "extraction_latency": 0.0
}}

Requirement Document Text:
{payload.raw_text}
"""
        logger.info(f"Sending requirement doc to Gemini: {payload.doc_id}")

        structured = llm.generate_json(prompt)

        if not isinstance(structured, dict):
            structured = {}

        doc_data = RequirementStructuredData(**structured)

        logger.info(f"Successfully structured requirement doc: {payload.doc_id}")

        return {
            "source_file": payload.doc_id,
            "structured_data": doc_data.model_dump(),
        }

    except Exception as e:
        error_details = traceback.format_exc()
        print("CRITICAL AI ERROR:\n", error_details)
        logger.error(f"Requirement doc structured extraction failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")