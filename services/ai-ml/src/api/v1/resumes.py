import logging
import requests
import tempfile
import os

from fastapi import APIRouter, HTTPException
from schemas.resume import (
    ResumeProcessRequest,
    ResumeProcessResponse,
)

from services.embeddings.service import EmbeddingService
from services.extractors.pdf import extract_pdf
from services.extractors.docx import extract_docx


logger = logging.getLogger(__name__)
router = APIRouter()
embedding_service = EmbeddingService()


@router.post("/process", response_model=ResumeProcessResponse)
async def process_resume(body: ResumeProcessRequest):
    """
    Full pipeline:
    1. Download file from Supabase storage
    2. Extract text (PDF or DOCX)
    3. Generate embedding
    """
    try:
        response = requests.get(str(body.file_url))
        response.raise_for_status()
        file_bytes = response.content
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to download file: {str(e)}")

    suffix = ".pdf" if str(body.file_url).lower().endswith(".pdf") else ".docx"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(file_bytes)
        temp_path = tmp.name

    try:
        if str(body.file_url).lower().endswith(".pdf"):
            result = extract_pdf(temp_path)
            extracted_text = result.text
        elif str(body.file_url).lower().endswith(".docx"):
            result = extract_docx(temp_path)
            extracted_text = result.text
        else:
            raise HTTPException(status_code=400, detail="Unsupported file type. Only PDF and DOCX are supported.")

        if not extracted_text or not extracted_text.strip():
            raise HTTPException(status_code=422, detail="No text could be extracted from the file.")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Extraction failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    try:
        embedding = embedding_service.get_embedding(extracted_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embedding generation failed: {str(e)}")

    return ResumeProcessResponse(
        resume_id=body.resume_id,
        status="processed",
        extracted_text_length=len(extracted_text),
        embedding_dimension=len(embedding),
    )
