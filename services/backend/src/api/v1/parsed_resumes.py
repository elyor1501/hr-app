import json
from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from src.db.session import get_db_session
from src.db.models import ParsedResume
from src.models.parsed_resume import ParsedResumeResponse
from src.core.redis import get_redis_pool

router = APIRouter()

PARSED_RESUMES_CACHE_KEY = "hr_app:parsed_resumes:list"
PARSED_RESUMES_CACHE_TTL = 60


class UpdateCandidateStatusRequest(BaseModel):
    candidate_status: str = Field(..., pattern="^(active|inactive)$")


class UpdateParsedResumeRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    education: Optional[List[dict]] = None
    experience: Optional[List[dict]] = None
    projects: Optional[List[dict]] = None
    certifications: Optional[List[dict]] = None
    candidate_status: Optional[str] = Field(None, pattern="^(active|inactive)$")


class PaginatedParsedResumesResponse(BaseModel):
    items: List[ParsedResumeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool


async def invalidate_parsed_resumes_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:parsed_resumes:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


@router.get("/", response_model=PaginatedParsedResumesResponse)
async def list_parsed_resumes(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    status_filter: Optional[str] = Query(default=None, pattern="^(active|inactive)$", alias="status"),
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"{PARSED_RESUMES_CACHE_KEY}:{page}:{page_size}:{status_filter or 'all'}"
    
    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return PaginatedParsedResumesResponse(**json.loads(cached))
    except Exception:
        pass

    if status_filter:
        count_query = text("SELECT COUNT(*) FROM parsed_resumes WHERE candidate_status = :status")
        count_result = await session.execute(count_query, {"status": status_filter})
    else:
        count_query = text("SELECT COUNT(*) FROM parsed_resumes")
        count_result = await session.execute(count_query)
    
    total = count_result.scalar() or 0
    
    offset = (page - 1) * page_size
    
    if status_filter:
        query = text("""
            SELECT id, resume_id, first_name, last_name, email, phone, current_title,
                   current_company, years_of_experience, skills, location, linkedin_url,
                   github, portfolio, summary, education, experience, projects,
                   certifications, confidence_scores, confidence_score, extraction_latency,
                   json_data, candidate_status, created_at, updated_at
            FROM parsed_resumes
            WHERE candidate_status = :status
            ORDER BY created_at DESC
            OFFSET :offset LIMIT :limit
        """)
        result = await session.execute(query, {"status": status_filter, "offset": offset, "limit": page_size})
    else:
        query = text("""
            SELECT id, resume_id, first_name, last_name, email, phone, current_title,
                   current_company, years_of_experience, skills, location, linkedin_url,
                   github, portfolio, summary, education, experience, projects,
                   certifications, confidence_scores, confidence_score, extraction_latency,
                   json_data, candidate_status, created_at, updated_at
            FROM parsed_resumes
            ORDER BY created_at DESC
            OFFSET :offset LIMIT :limit
        """)
        result = await session.execute(query, {"offset": offset, "limit": page_size})
    
    rows = result.fetchall()
    
    items = []
    for row in rows:
        items.append({
            "id": str(row.id),
            "resume_id": str(row.resume_id),
            "first_name": row.first_name,
            "last_name": row.last_name,
            "email": row.email,
            "phone": row.phone,
            "current_title": row.current_title,
            "current_company": row.current_company,
            "years_of_experience": row.years_of_experience,
            "skills": row.skills,
            "location": row.location,
            "linkedin_url": row.linkedin_url,
            "github": row.github,
            "portfolio": row.portfolio,
            "summary": row.summary,
            "education": row.education,
            "experience": row.experience,
            "projects": row.projects,
            "certifications": row.certifications,
            "confidence_scores": row.confidence_scores,
            "confidence_score": float(row.confidence_score) if row.confidence_score else None,
            "extraction_latency": float(row.extraction_latency) if row.extraction_latency else None,
            "json_data": row.json_data,
            "candidate_status": row.candidate_status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        })
    
    total_pages = (total + page_size - 1) // page_size if total > 0 else 1
    
    response_data = {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, PARSED_RESUMES_CACHE_TTL, json.dumps(response_data))
    except Exception:
        pass

    return PaginatedParsedResumesResponse(**response_data)


@router.get("/{resume_id}", response_model=ParsedResumeResponse)
async def get_parsed_resume_by_resume_id(
    resume_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"hr_app:parsed_resume:{resume_id}"
    
    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return ParsedResumeResponse(**json.loads(cached))
    except Exception:
        pass
    
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.resume_id == resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    
    if not parsed_resume:
        raise HTTPException(
            status_code=404,
            detail="Parsed resume data not found for this resume. The AI might still be processing it."
        )
    
    response = parsed_resume.to_dict() if hasattr(parsed_resume, 'to_dict') else {
        "id": str(parsed_resume.id),
        "resume_id": str(parsed_resume.resume_id),
        "first_name": parsed_resume.first_name,
        "last_name": parsed_resume.last_name,
        "email": parsed_resume.email,
        "phone": parsed_resume.phone,
        "current_title": parsed_resume.current_title,
        "current_company": parsed_resume.current_company,
        "years_of_experience": parsed_resume.years_of_experience,
        "skills": parsed_resume.skills,
        "location": parsed_resume.location,
        "linkedin_url": parsed_resume.linkedin_url,
        "github": parsed_resume.github,
        "portfolio": parsed_resume.portfolio,
        "summary": parsed_resume.summary,
        "education": parsed_resume.education,
        "experience": parsed_resume.experience,
        "projects": parsed_resume.projects,
        "certifications": parsed_resume.certifications,
        "candidate_status": parsed_resume.candidate_status,
    }
    
    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, PARSED_RESUMES_CACHE_TTL, json.dumps(response))
    except Exception:
        pass
    
    return parsed_resume


@router.put("/{parsed_resume_id}")
async def update_parsed_resume_full(
    parsed_resume_id: UUID,
    request: UpdateParsedResumeRequest,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == parsed_resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    
    if not parsed_resume:
        raise HTTPException(status_code=404, detail="Parsed resume not found")
    
    update_data = request.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(parsed_resume, field, value)
    
    await session.commit()
    await session.refresh(parsed_resume)
    
    await invalidate_parsed_resumes_cache()
    
    try:
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:parsed_resume:{parsed_resume.resume_id}")
    except Exception:
        pass
    
    return {
        "message": "Resume updated successfully",
        "id": str(parsed_resume.id),
        "updated_fields": list(update_data.keys())
    }


@router.patch("/{parsed_resume_id}/status")
async def update_candidate_status(
    parsed_resume_id: UUID,
    request: UpdateCandidateStatusRequest,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == parsed_resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    
    if not parsed_resume:
        raise HTTPException(status_code=404, detail="Parsed resume not found")
    
    parsed_resume.candidate_status = request.candidate_status
    await session.commit()
    
    await invalidate_parsed_resumes_cache()
    
    return {
        "message": "Status updated successfully",
        "candidate_status": parsed_resume.candidate_status
    }


@router.patch("/{parsed_resume_id}")
async def update_parsed_resume_partial(
    parsed_resume_id: UUID,
    request: UpdateParsedResumeRequest,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == parsed_resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    
    if not parsed_resume:
        raise HTTPException(status_code=404, detail="Parsed resume not found")
    
    update_data = request.model_dump(exclude_unset=True)
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    for field, value in update_data.items():
        setattr(parsed_resume, field, value)
    
    await session.commit()
    await session.refresh(parsed_resume)
    
    await invalidate_parsed_resumes_cache()
    
    try:
        redis = await get_redis_pool()
        await redis.delete(f"hr_app:parsed_resume:{parsed_resume.resume_id}")
    except Exception:
        pass
    
    return {
        "message": "Resume updated successfully",
        "id": str(parsed_resume.id),
        "updated_fields": list(update_data.keys())
    }


@router.delete("/{parsed_resume_id}", status_code=status.HTTP_200_OK)
async def delete_parsed_resume(
    parsed_resume_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.id == parsed_resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    
    if not parsed_resume:
        raise HTTPException(status_code=404, detail="Parsed resume not found")
    
    await session.delete(parsed_resume)
    await session.commit()
    
    await invalidate_parsed_resumes_cache()
    
    return {
        "message": "Parsed resume deleted successfully",
        "id": str(parsed_resume_id)
    }