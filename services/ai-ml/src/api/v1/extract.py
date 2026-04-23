import httpx
import tempfile
import os
import logging
import asyncio

from fastapi import APIRouter, HTTPException

from api.v1.schemas import ExtractRequest, ExtractResponse
from services.extractors.pdf.extractor import extract_pdf
from services.extractors.docx.extractor import extract_docx
from services.extractors.pptx.extractor import extract_pptx


router = APIRouter(prefix="/extract", tags=["Extraction"])
logger = logging.getLogger(__name__)


@router.post("", response_model=ExtractResponse)
async def extract_resume(payload: ExtractRequest):

    temp_path = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            file_response = await client.get(payload.file_url)

        if file_response.status_code != 200:
            raise HTTPException(
                status_code=400,
                detail="Unable to download file"
            )

        file_type = payload.file_type.lower()

        suffix = f".{file_type}"

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_response.content)
            temp_path = tmp.name

        if file_type == "pdf":
            result = await asyncio.to_thread(extract_pdf, temp_path)

        elif file_type in ("docx", "doc"):
            result = await asyncio.to_thread(extract_docx, temp_path)

        elif file_type in ("pptx", "ppt"):
            result = await asyncio.to_thread(extract_pptx, temp_path)

        else:
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Supported: pdf, doc, docx, ppt, pptx"
            )

        raw_text = result.text
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

    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)