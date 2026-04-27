import traceback
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Dict, Any, List, Optional, Union
import datetime
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


@router.post("")
async def structure_resume(payload: StructureRequest):
    try:
        prompt = f"""
Extract structured resume data in JSON format strictly adhering to the following structure. Return ONLY valid JSON, no markdown.

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
  "projects": [],
  "certifications": [],
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
{payload.raw_text}
"""
        logger.info(f"Sending text to Gemini for resume: {payload.resume_id}")

        structured = llm.generate_json(prompt)

        if not isinstance(structured, dict):
            structured = {}

        candidate_data = StructuredData(**structured)

        logger.info(f"Successfully structured resume: {payload.resume_id}")

        return {
            "source_file": payload.resume_id,
            "structured_data": candidate_data.model_dump(),
        }

    except Exception as e:
        error_details = traceback.format_exc()
        print("CRITICAL AI ERROR:\n", error_details)
        logger.error(f"Structured extraction failed: {str(e)}")

        try:
            empty_data = StructuredData()
            return {
                "source_file": payload.resume_id,
                "structured_data": empty_data.model_dump(),
            }
        except Exception:
            raise HTTPException(status_code=500, detail=f"AI Error: {str(e)}")


@router.post("/batch")
async def structure_resume_batch(payload: BatchStructureRequest):
    try:
        logger.info(f"Batch structuring {len(payload.resumes)} resumes")

        resume_texts = [
            {"resume_id": r.resume_id, "raw_text": r.raw_text}
            for r in payload.resumes
        ]

        import asyncio
        results_raw = await asyncio.to_thread(llm.generate_json_batch, resume_texts)

        results = []
        for raw in results_raw:
            if not isinstance(raw, dict):
                raw = {}
            resume_id = raw.pop("resume_id", "unknown")
            try:
                candidate_data = StructuredData(**raw)
            except Exception:
                candidate_data = StructuredData()
            results.append({
                "source_file": resume_id,
                "structured_data": candidate_data.model_dump(),
            })

        logger.info(f"Batch structuring completed for {len(results)} resumes")
        return {"results": results}

    except Exception as e:
        error_details = traceback.format_exc()
        print("CRITICAL BATCH AI ERROR:\n", error_details)
        logger.error(f"Batch structuring failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Batch AI Error: {str(e)}")