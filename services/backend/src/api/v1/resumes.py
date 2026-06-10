import asyncio
import json
import structlog
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, text

from src.db.session import get_db_session, async_session_maker
from src.repositories.base import BaseRepository
from src.db.models import Resume, ParsedResume, Candidate, CandidateCV
from src.services.storage import upload_file_bytes, delete_file_from_storage
from src.services.task_queue import get_task_queue
from src.models.base import IDSchema, TimestampSchema
from src.core.redis import get_redis_pool
from src.api.deps import get_current_user
from src.models.auth import TokenPayload
from pydantic import BaseModel

router = APIRouter()

upload_logger = structlog.get_logger()

RESUMES_CACHE_KEY = "hr_app:resumes:list"
RESUMES_CACHE_TTL = 300
MAX_UPLOAD_LIMIT = 300
UPLOAD_CONCURRENCY = 3
JOB_CHUNK_SIZE = 10

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


class PaginatedResumesResponse(BaseModel):
    items: List[ResumeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


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


class BulkDeleteRequest(BaseModel):
    ids: List[UUID]


class BulkDeleteResponse(BaseModel):
    deleted: int
    failed: int
    message: str


def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[Resume]:
    return BaseRepository(Resume, session)


async def invalidate_resumes_cache():
    try:
        redis = await get_redis_pool()
        cursor = 0
        keys_to_delete = []
        while True:
            cursor, keys = await redis.scan(cursor, match="hr_app:resumes:*", count=100)
            keys_to_delete.extend(keys)
            if cursor == 0:
                break
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match="hr_app:candidates:*", count=100)
            keys_to_delete.extend(keys)
            if cursor == 0:
                break
        cursor = 0
        while True:
            cursor, keys = await redis.scan(cursor, match="hr_backend:search:*", count=100)
            keys_to_delete.extend(keys)
            if cursor == 0:
                break
        if keys_to_delete:
            await redis.delete(*keys_to_delete)
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


async def _process_batch_background(files_data: List[dict], uploaded_by: str, batch_id: str):
    semaphore = asyncio.Semaphore(UPLOAD_CONCURRENCY)

    async def process_one(fd):
        async with semaphore:
            return await _process_file_background(fd)

    upload_results = await asyncio.gather(
        *[process_one(fd) for fd in files_data],
        return_exceptions=True
    )

    created_items = []
    for result in upload_results:
        if isinstance(result, Exception):
            continue
        if result:
            created_items.append(result)

    await invalidate_resumes_cache()

    if created_items:
        upload_logger.info(
            "bulk_resumes_uploaded",
            uploaded_by=uploaded_by,
            batch_id=batch_id,
            total_accepted=len(files_data),
            total_uploaded=len(created_items),
            file_names=[fd["filename"] for fd in files_data],
        )

    if not created_items:
        return

    queue = await get_task_queue()

    chunks = [
        created_items[i:i + JOB_CHUNK_SIZE]
        for i in range(0, len(created_items), JOB_CHUNK_SIZE)
    ]

    for chunk in chunks:
        await queue.enqueue_job(
            "process_resumes_batch",
            resume_items=chunk,
        )


@router.post("/bulk", response_model=BulkUploadAccepted, status_code=status.HTTP_202_ACCEPTED)
async def bulk_upload_resumes(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    current_user: TokenPayload = Depends(get_current_user),
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

    upload_logger.info(
        "bulk_resumes_upload_initiated",
        uploaded_by=current_user.sub,
        batch_id=batch_id,
        file_count=len(valid_files),
        file_names=[f["filename"] for f in valid_files],
    )

    await invalidate_resumes_cache()

    background_tasks.add_task(_process_batch_background, valid_files, current_user.sub, batch_id)

    return BulkUploadAccepted(
        accepted=len(valid_files),
        message=f"{len(valid_files)} files accepted for processing",
        batch_id=batch_id,
    )


@router.delete("/bulk", response_model=BulkDeleteResponse)
async def bulk_delete_resumes(
    data: BulkDeleteRequest,
    session: AsyncSession = Depends(get_db_session),
):
    if not data.ids:
        raise HTTPException(status_code=400, detail="No IDs provided")

    try:
        result = await session.execute(
            select(Resume.id, Resume.file_url).where(Resume.id.in_(data.ids))
        )
        resume_rows = result.all()

        if not resume_rows:
            return BulkDeleteResponse(
                deleted=0,
                failed=len(data.ids),
                message=f"Deleted 0 resumes. {len(data.ids)} failed."
            )

        resume_ids = [row.id for row in resume_rows]
        file_urls = list({row.file_url for row in resume_rows if row.file_url})

        candidate_ids = []
        if file_urls:
            result = await session.execute(
                select(CandidateCV.candidate_id).where(CandidateCV.file_url.in_(file_urls))
            )
            candidate_ids = list(set(result.scalars().all()))

            await session.execute(
                delete(CandidateCV).where(CandidateCV.file_url.in_(file_urls))
            )

            for candidate_id in candidate_ids:
                remaining_result = await session.execute(
                    select(CandidateCV.id).where(CandidateCV.candidate_id == candidate_id).limit(1)
                )
                remaining_cv_id = remaining_result.scalar_one_or_none()
                if remaining_cv_id is None:
                    await session.execute(
                        delete(Candidate).where(Candidate.id == candidate_id)
                    )

        delete_result = await session.execute(
            delete(Resume).where(Resume.id.in_(resume_ids))
        )
        deleted_count = delete_result.rowcount or 0

        await session.commit()
        await invalidate_resumes_cache()

        for url in file_urls:
            try:
                await delete_file_from_storage(url)
            except Exception:
                pass

        failed_count = len(data.ids) - deleted_count

        return BulkDeleteResponse(
            deleted=deleted_count,
            failed=failed_count,
            message=f"Deleted {deleted_count} resumes. {failed_count} failed." if failed_count > 0 else f"Successfully deleted {deleted_count} resumes."
        )

    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk delete failed: {str(e)}")


@router.get("/", response_model=PaginatedResumesResponse)
async def list_resumes(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    q: Optional[str] = Query(None),
    dateFrom: Optional[str] = Query(None),
    dateTo: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db_session)
):
    from datetime import datetime, timezone

    cache_key = f"{RESUMES_CACHE_KEY}:{page}:{page_size}:{q or ''}:{dateFrom or ''}:{dateTo or ''}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedResumesResponse(**json.loads(cached))
    except Exception:
        pass

    conditions = []
    params: dict = {"skip": (page - 1) * page_size, "limit": page_size}

    if q:
        conditions.append("file_name ILIKE :q")
        params["q"] = f"%{q}%"

    if dateFrom:
        try:
            dt = datetime.strptime(dateFrom, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            conditions.append("created_at >= :date_from")
            params["date_from"] = dt
        except ValueError:
            pass

    if dateTo:
        try:
            dt = datetime.strptime(dateTo, "%Y-%m-%d").replace(
                hour=23, minute=59, second=59, tzinfo=timezone.utc
            )
            conditions.append("created_at <= :date_to")
            params["date_to"] = dt
        except ValueError:
            pass

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

    count_params = {k: v for k, v in params.items() if k not in ("skip", "limit")}
    count_query = text(f"SELECT COUNT(*) FROM resumes {where_clause}")
    count_result = await session.execute(count_query, count_params)
    total = count_result.scalar() or 0

    total_pages = (total + page_size - 1) // page_size if total > 0 else 1

    query = text(f"""
        SELECT id, file_name, file_url, raw_text, created_at, updated_at
        FROM resumes
        {where_clause}
        ORDER BY created_at DESC
        OFFSET :skip LIMIT :limit
    """)

    result = await session.execute(query, params)
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

    response_data = {
        "items": resumes,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1,
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, RESUMES_CACHE_TTL, json.dumps(response_data))
    except Exception:
        pass

    return PaginatedResumesResponse(**response_data)


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
async def delete_resume(id: UUID, session: AsyncSession = Depends(get_db_session)):
    result = await session.execute(select(Resume).where(Resume.id == id))
    resume = result.scalar_one_or_none()
    if not resume:
        raise HTTPException(status_code=404, detail="Resume not found")

    file_url = resume.file_url

    result = await session.execute(
        select(CandidateCV.candidate_id).where(CandidateCV.file_url == file_url)
    )
    candidate_ids = list(set(result.scalars().all()))

    await session.execute(
        delete(CandidateCV).where(CandidateCV.file_url == file_url)
    )

    for candidate_id in candidate_ids:
        remaining_result = await session.execute(
            select(CandidateCV.id).where(CandidateCV.candidate_id == candidate_id).limit(1)
        )
        remaining_cv_id = remaining_result.scalar_one_or_none()
        if remaining_cv_id is None:
            await session.execute(
                delete(Candidate).where(Candidate.id == candidate_id)
            )

    await session.execute(
        delete(Resume).where(Resume.id == id)
    )

    await session.commit()

    try:
        await delete_file_from_storage(file_url)
    except Exception:
        pass

    await invalidate_resumes_cache()