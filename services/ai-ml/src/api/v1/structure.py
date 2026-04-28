import traceback
import logging
import asyncio
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional, Union
from services.llm.gemini_llm_client import GeminiLLMClient

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


async def _structure_one(resume_id: str, raw_text: str) -> dict:
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