import asyncio
import json
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from src.db.session import get_db_session, async_session_maker
from src.repositories.base import BaseRepository
from src.db.models import Resume, ParsedResume
from src.services.storage import upload_file_bytes, delete_file_from_storage
from src.services.task_queue import get_task_queue
from src.models.base import IDSchema, TimestampSchema
from src.core.redis import get_redis_pool
from pydantic import BaseModel

router = APIRouter()

RESUMES_CACHE_KEY = "hr_app:resumes:list"
RESUMES_CACHE_TTL = 60
MAX_UPLOAD_LIMIT = 300
UPLOAD_CONCURRENCY = 5

ALLOWED_EXTENSIONS = {"pdf", "doc", "docx", "ppt", "pptx"}


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


class BulkUploadAccepted(BaseModel):
    accepted: int
    message: str
    batch_id: str


def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Resume]:
    return BaseRepository(Resume, session)


async def invalidate_resumes_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:resumes:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


async def _process_file_background(file_data: dict):
    try:
        url = await upload_file_bytes(
            file_content=file_data["content"],
            filename=file_data["filename"],
            content_type=file_data["content_type"],
        )
        if not url:
            return None

        async with async_session_maker() as session:
            resume = Resume(
                file_name=file_data["filename"],
                file_url=url,
            )
            session.add(resume)
            await session.commit()
            await session.refresh(resume)

        return {
            "resume_id": str(resume.id),
            "file_url": url,
            "file_type": file_data["file_ext"],
        }

    except Exception:
        return None


async def _process_batch_background(files_data: List[dict]):
    semaphore = asyncio.Semaphore(UPLOAD_CONCURRENCY)

    async def process_one(fd):
        async with semaphore:
            return await _process_file_background(fd)

    upload_results = await asyncio.gather(*[process_one(fd) for fd in files_data], return_exceptions=True)

    created_items = []
    for result in upload_results:
        if isinstance(result, Exception):
            continue
        if result:
            created_items.append(result)

    await invalidate_resumes_cache()

    if not created_items:
        return

    queue = await get_task_queue()

    JOB_CHUNK_SIZE = 100
    chunks = [created_items[i:i + JOB_CHUNK_SIZE] for i in range(0, len(created_items), JOB_CHUNK_SIZE)]

    for chunk in chunks:
        await queue.enqueue_job(
            "process_resumes_batch",
            resume_items=chunk,
        )


@router.post("/bulk", response_model=BulkUploadAccepted, status_code=status.HTTP_202_ACCEPTED)
async def bulk_upload_resumes(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
):
    if len(files) > MAX_UPLOAD_LIMIT:
        raise HTTPException(400, f"Maximum {MAX_UPLOAD_LIMIT} files allowed")

    valid_files = []
    for file in files:
        filename = file.filename or "unknown.pdf"
        file_ext = filename.split(".")[-1].lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            continue
        content = await file.read()
        if not content:
            continue
        valid_files.append({
            "content": content,
            "filename": filename,
            "content_type": file.content_type or "application/octet-stream",
            "file_ext": file_ext,
        })

    if not valid_files:
        raise HTTPException(400, "No valid files uploaded")

    batch_id = str(uuid4())

    await invalidate_resumes_cache()

    background_tasks.add_task(_process_batch_background, valid_files)

    return BulkUploadAccepted(
        accepted=len(valid_files),
        message=f"{len(valid_files)} files accepted for processing",
        batch_id=batch_id,
    )


@router.get("/", response_model=List[ResumeResponse])
async def list_resumes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session)
):
    cache_key = f"{RESUMES_CACHE_KEY}:{skip}:{limit}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    query = text("""
        SELECT id, file_name, file_url, raw_text, created_at, updated_at
        FROM resumes
        ORDER BY created_at DESC
        OFFSET :skip LIMIT :limit
    """)

    result = await session.execute(query, {"skip": skip, "limit": limit})
    rows = result.fetchall()

    resumes = [
        {
            "id": str(row.id),
            "file_name": row.file_name,
            "file_url": row.file_url,
            "raw_text": row.raw_text,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
            "task_id": None
        }
        for row in rows
    ]

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, RESUMES_CACHE_TTL, json.dumps(resumes))
    except Exception:
        pass

    return resumes


@router.get("/{id}", response_model=ResumeDetailResponse)
async def get_resume(id: UUID, repo: BaseRepository[Resume] = Depends(get_repository)):
    cache_key = f"hr_app:resume:{id}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    resume = await repo.get_by_id(id)
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    response = {
        "id": str(resume.id),
        "file_name": resume.file_name,
        "file_url": resume.file_url,
        "raw_text": resume.raw_text,
        "embedding": None,
        "created_at": resume.created_at.isoformat() if resume.created_at else None,
        "updated_at": resume.updated_at.isoformat() if resume.updated_at else None,
        "task_id": None
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, RESUMES_CACHE_TTL, json.dumps(response))
    except Exception:
        pass

    return response


@router.get("/{id}/parsed", response_model=ParsedDataResponse)
async def get_parsed_resume(id: UUID, session: AsyncSession = Depends(get_db_session)):
    cache_key = f"hr_app:parsed_resume:{id}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    stmt = select(ParsedResume).where(ParsedResume.resume_id == id)
    result = await session.execute(stmt)
    parsed = result.scalar_one_or_none()

    if not parsed:
        raise HTTPException(status_code=404, detail="Parsed data not found for this resume")

    response = {
        "id": str(parsed.id),
        "resume_id": str(parsed.resume_id),
        "first_name": parsed.first_name,
        "last_name": parsed.last_name,
        "email": parsed.email,
        "phone": parsed.phone,
        "current_title": parsed.current_title,
        "current_company": parsed.current_company,
        "years_of_experience": parsed.years_of_experience,
        "skills": parsed.skills,
        "location": parsed.location,
        "linkedin_url": parsed.linkedin_url,
        "summary": parsed.summary,
        "json_data": parsed.json_data
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, RESUMES_CACHE_TTL, json.dumps(response))
    except Exception:
        pass

    return response


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
    await invalidate_resumes_cache()