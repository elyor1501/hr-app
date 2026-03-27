import asyncio
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from src.db.session import get_db_session
from src.repositories.base import BaseRepository
from src.db.models import Resume, ParsedResume
from src.services.storage import delete_file_from_storage
from src.services.task_queue import get_task_queue
from src.models.base import IDSchema, TimestampSchema
from src.services.storage import upload_file_bytes
from pydantic import BaseModel

router = APIRouter()

BATCH_THRESHOLD = 3

class ResumeResponse(IDSchema, TimestampSchema):
    file_name: str
    file_url: str
    raw_text: Optional[str] = None
    task_id: Optional[str] = None

class ResumeDetailResponse(IDSchema, TimestampSchema):
    file_name: str
    file_url: str
    raw_text: Optional[str] = None
    embedding: Optional[List[float]] = None
    task_id: Optional[str] = None

class ParsedDataResponse(BaseModel):
    id: UUID
    resume_id: UUID
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    current_title: Optional[str]
    current_company: Optional[str]
    years_of_experience: Optional[int]
    skills: Optional[List[str]]
    location: Optional[str]
    linkedin_url: Optional[str]
    summary: Optional[str]
    json_data: Optional[dict]

def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Resume]:
    return BaseRepository(Resume, session)

async def upload_bytes_to_storage(file_data: dict):
    try:
        public_url = await upload_file_bytes(
            file_data["content"],
            file_data["filename"],
            file_data["content_type"]
        )

        if not public_url:
            return None

        return {
            "file_name": file_data["filename"],
            "file_url": public_url,
            "file_type": file_data["file_ext"],
        }

    except Exception:
        return None

@router.post("/bulk", response_model=List[ResumeResponse], status_code=status.HTTP_201_CREATED)
async def bulk_upload_resumes(
    files: List[UploadFile] = File(...),
    repo: BaseRepository[Resume] = Depends(get_repository),
):
    if len(files) > 50:
        raise HTTPException(400, "Maximum 50 files allowed")

    file_data_list = []
    for file in files:
        filename = file.filename or "unknown.pdf"
        file_ext = filename.split(".")[-1].lower()

        if file_ext not in ["pdf", "doc", "docx"]:
            continue

        content = await file.read()
        if content:
            file_data_list.append({
                "content": content,
                "filename": filename,
                "content_type": file.content_type or "application/pdf",
                "file_ext": file_ext,
            })

    if not file_data_list:
        raise HTTPException(400, "No valid files uploaded")

    upload_tasks = [upload_bytes_to_storage(fd) for fd in file_data_list]
    storage_results = await asyncio.gather(*upload_tasks)

    uploaded_files = [r for r in storage_results if r is not None]

    if not uploaded_files:
        raise HTTPException(400, "No valid files uploaded")

    created_resumes = []

    for item in uploaded_files:
        resume = await repo.create(
            file_name=item["file_name"],
            file_url=item["file_url"],
        )
        created_resumes.append(
            {
                "resume_id": str(resume.id),
                "file_url": item["file_url"],
                "file_type": item["file_type"],
                "resume_dict": resume.to_dict(),
            }
        )

    queue = await get_task_queue()

    if len(created_resumes) >= BATCH_THRESHOLD:
        resume_items = [
            {
                "resume_id": item["resume_id"],
                "file_url": item["file_url"],
                "file_type": item["file_type"],
            }
            for item in created_resumes
        ]

        job = await queue.enqueue_job(
            "process_resumes_batch",
            resume_items=resume_items,
        )

        response = []
        for item in created_resumes:
            d = item["resume_dict"]
            d["task_id"] = job.job_id
            response.append(d)

        return response

    else:
        response = []

        for item in created_resumes:
            job = await queue.enqueue_job(
                "process_resume",
                resume_id=item["resume_id"],
                file_url=item["file_url"],
                file_type=item["file_type"],
            )

            d = item["resume_dict"]
            d["task_id"] = job.job_id
            response.append(d)

        return response

@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(skip: int = Query(0, ge=0), limit: int = Query(100, ge=1, le=100), repo: BaseRepository[Resume] = Depends(get_repository)):
    return await repo.get_all(skip=skip, limit=limit)

@router.get("/{id}", response_model=ResumeDetailResponse)
async def get_resume(id: UUID, repo: BaseRepository[Resume] = Depends(get_repository)):
    resume = await repo.get_by_id(id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return resume

@router.get("/{id}/parsed", response_model=ParsedDataResponse)
async def get_parsed_resume(id: UUID, session: AsyncSession = Depends(get_db_session)):
    stmt = select(ParsedResume).where(ParsedResume.resume_id == id)
    result = await session.execute(stmt)
    parsed = result.scalar_one_or_none()
    
    if not parsed:
        raise HTTPException(status_code=404, detail="Parsed data not found for this resume")
    
    return parsed

@router.get("/{id}/download")
async def download_resume(id: UUID, repo: BaseRepository[Resume] = Depends(get_repository)):
    resume = await repo.get_by_id(id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    return RedirectResponse(url=resume.file_url)

@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(id: UUID, repo: BaseRepository[Resume] = Depends(get_repository)):
    resume = await repo.get_by_id(id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")
    try:
        await delete_file_from_storage(resume.file_url)
    except Exception:
        pass
    await repo.delete(id)