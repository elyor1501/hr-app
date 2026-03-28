import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from src.db.session import get_db_session
from src.repositories.base import BaseRepository
from src.db.models import Resume, ParsedResume
from src.services.storage import upload_file, delete_file_from_storage
from src.services.task_queue import get_task_queue
from src.models.base import IDSchema, TimestampSchema
from src.core.redis import get_redis_pool
from pydantic import BaseModel

router = APIRouter()

BATCH_THRESHOLD = 3
RESUMES_CACHE_KEY = "hr_app:resumes:list"
RESUMES_CACHE_TTL = 60


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


async def upload_to_storage(file: UploadFile):
    filename = file.filename or "unknown.pdf"
    file_ext = filename.split(".")[-1].lower()

    if file_ext not in ["pdf", "doc", "docx"]:
        return None

    try:
        public_url = await upload_file(file)

        if not public_url:
            return None

        return {
            "file_name": filename,
            "file_url": public_url,
            "file_type": file_ext,
        }

    except Exception:
        return None


async def invalidate_resumes_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:resumes:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


@router.post("/bulk", response_model=List[ResumeResponse], status_code=status.HTTP_201_CREATED)
async def bulk_upload_resumes(
    files: List[UploadFile] = File(...),
    repo: BaseRepository[Resume] = Depends(get_repository),
):
    if len(files) > 50:
        raise HTTPException(400, "Maximum 50 files allowed")

    uploaded_files = []
    for file in files:
        result = await upload_to_storage(file)
        if result:
            uploaded_files.append(result)

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

    await invalidate_resumes_cache()

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