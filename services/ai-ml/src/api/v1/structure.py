import time
import traceback
import logging

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from schemas.extracted_cv import ExtractedCV
from services.llm.gemini_llm_client import GeminiLLMClient


llm = GeminiLLMClient()
router = APIRouter(prefix="/structure", tags=["Structured Extraction"])
logger = logging.getLogger(__name__)


class StructureRequest(BaseModel):
    resume_id: str
    raw_text: str = Field(..., min_length=1)


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
      "grade": string or null
    }}
  ],
  "experience": [
    {{
      "job_title": string or null,
      "company": string or null,
      "location": string or null,
      "start_date": string or null,
      "end_date": string or null,
      "responsibilities": [string]
    }}
  ],
  "projects": [
    {{
      "project_name": string or null,
      "description": string or null,
      "technologies": [string]
    }}
  ],
  "certifications": [string],
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
  "confidence_score": float
}}

Resume Text:
{payload.raw_text}
"""
        start = time.time()
        logger.info(f"Structuring resume: {payload.resume_id}")

        structured = llm.generate_json(prompt)

        if not isinstance(structured, dict):
            structured = {}

        structured["extraction_latency"] = round(time.time() - start, 3)

        # full_name is required — fall back to empty string if LLM omits it
        if not structured.get("full_name"):
            structured["full_name"] = ""

        candidate_data = ExtractedCV(**structured)

        logger.info(f"Structured resume successfully: {payload.resume_id}")

        return {
            "source_file": payload.resume_id,
            "structured_data": candidate_data.model_dump(),
        }

    except Exception as e:
        logger.error(f"Structured extraction failed for {payload.resume_id}: {str(e)}")
        logger.debug(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Extraction error: {str(e)}")
