import requests
import tempfile
import os
import logging

from fastapi import APIRouter, HTTPException

from api.v1.schemas import ExtractRequest, ExtractResponse

from services.extractors.pdf.extractor import extract_pdf
from services.extractors.docx.extractor import extract_docx


router = APIRouter(prefix="/extract", tags=["Extraction"])
logger = logging.getLogger(__name__)


@router.post("", response_model=ExtractResponse)
def extract_resume(payload: ExtractRequest):

    try:
        # Download file
        file_response = requests.get(payload.file_url)

        if file_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Unable to download file"
            )

        # Save temporary file
        with tempfile.NamedTemporaryFile(delete=False) as tmp:
            tmp.write(file_response.content)
            temp_path = tmp.name

        file_type = payload.file_type.lower()

        if file_type == "pdf":
            result = extract_pdf(temp_path)
            raw_text = result.text

        elif file_type == "docx":
            result = extract_docx(temp_path)
            raw_text = result.text

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type"
            )

        os.remove(temp_path)

        if not raw_text or not raw_text.strip():
            raise HTTPException(
                status_code=422,
                detail="No text extracted"
            )

        return ExtractResponse(
            resume_id=payload.resume_id,
            raw_text=raw_text,
            confidence=result.confidence
        )

    except HTTPException:
        raise

    except Exception as e:
        logger.exception("Extraction failed")
        raise HTTPException(status_code=500, detail=str(e))