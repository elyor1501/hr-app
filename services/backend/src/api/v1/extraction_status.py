import json
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db_session
from src.services.task_queue import get_task_status
from src.core.redis import get_redis_pool

router = APIRouter()


class ExtractionStatusResponse(BaseModel):
    task_id: Optional[str] = None
    status: str
    progress: int
    message: str
    result: Optional[dict] = None
    error: Optional[str] = None
    is_complete: bool
    is_failed: bool


@router.get("/resumes/{resume_id}/extraction-status", response_model=ExtractionStatusResponse)
async def get_resume_extraction_status(
    resume_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        text("SELECT raw_text FROM resumes WHERE id = :id"),
        {"id": str(resume_id)}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Resume not found")

    if row.raw_text and row.raw_text.strip():
        return ExtractionStatusResponse(
            task_id=None,
            status="completed",
            progress=100,
            message="Extraction completed successfully",
            result=None,
            error=None,
            is_complete=True,
            is_failed=False,
        )

    try:
        redis = await get_redis_pool()
        pattern = f"*:resumes:*{str(resume_id)}*"
        keys = await redis.keys(f"hr_worker:jobs:*")

        for key in keys:
            raw = await redis.get(key)
            if raw:
                data = json.loads(raw)
                result_data = data.get("result") or {}
                if str(resume_id) in str(result_data):
                    status = data.get("status", "pending")
                    progress = data.get("progress", 0)
                    is_complete = status == "completed"
                    is_failed = status in ("dead", "failed")

                    if is_complete:
                        message = "Extraction completed successfully"
                    elif is_failed:
                        message = data.get("error") or "Extraction failed"
                    else:
                        message = f"Processing... {progress}%"

                    return ExtractionStatusResponse(
                        task_id=key.split(":")[-1],
                        status=status,
                        progress=progress,
                        message=message,
                        result=result_data,
                        error=data.get("error"),
                        is_complete=is_complete,
                        is_failed=is_failed,
                    )
    except Exception:
        pass

    return ExtractionStatusResponse(
        task_id=None,
        status="pending",
        progress=0,
        message="Waiting for extraction to start...",
        result=None,
        error=None,
        is_complete=False,
        is_failed=False,
    )


@router.get("/requirement-docs/{doc_id}/extraction-status", response_model=ExtractionStatusResponse)
async def get_requirement_doc_extraction_status(
    doc_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        text("SELECT processing_status, raw_text FROM requirement_documents WHERE id = :id"),
        {"id": str(doc_id)}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Requirement document not found")

    if row.processing_status == "completed":
        return ExtractionStatusResponse(
            task_id=None,
            status="completed",
            progress=100,
            message="Extraction completed successfully",
            result=None,
            error=None,
            is_complete=True,
            is_failed=False,
        )

    if row.processing_status == "failed":
        return ExtractionStatusResponse(
            task_id=None,
            status="failed",
            progress=0,
            message="Extraction failed",
            result=None,
            error="Processing failed",
            is_complete=False,
            is_failed=True,
        )

    return ExtractionStatusResponse(
        task_id=None,
        status="processing",
        progress=50,
        message="Extraction in progress, please wait...",
        result=None,
        error=None,
        is_complete=False,
        is_failed=False,
    )


@router.get("/tasks/{task_id}/extraction-status", response_model=ExtractionStatusResponse)
async def get_task_extraction_status(task_id: str):
    job_info = await get_task_status(task_id)

    if not job_info:
        return ExtractionStatusResponse(
            task_id=task_id,
            status="pending",
            progress=0,
            message="Waiting in queue...",
            result=None,
            error=None,
            is_complete=False,
            is_failed=False,
        )

    status = job_info.get("status", "pending")
    is_complete = status == "completed"
    is_failed = status in ("dead", "failed")

    return ExtractionStatusResponse(
        task_id=task_id,
        status=status,
        progress=job_info.get("progress", 0),
        message=job_info.get("message", "Processing..."),
        result=job_info.get("result"),
        error=job_info.get("error"),
        is_complete=is_complete,
        is_failed=is_failed,
    )