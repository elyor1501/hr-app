from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field
from src.db.session import get_db_session
from src.db.models import ParsedResume
from src.models.parsed_resume import ParsedResumeResponse

router = APIRouter()

class UpdateCandidateStatusRequest(BaseModel):
    candidate_status: str = Field(..., pattern="^(active|inactive)$")

class PaginatedParsedResumesResponse(BaseModel):
    items: List[ParsedResumeResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
    has_next: bool
    has_previous: bool

@router.get("/", response_model=PaginatedParsedResumesResponse)
async def list_parsed_resumes(
    page: int = Query(1, ge=1, description="Page number (starts from 1)"),
    page_size: int = Query(10, ge=1, le=100, description="Number of items per page"),
    status: Optional[str] = Query(default=None, pattern="^(active|inactive)$"),
    session: AsyncSession = Depends(get_db_session),
):
    base_query = select(ParsedResume)
    if status:
        base_query = base_query.where(ParsedResume.candidate_status == status)
    
    count_result = await session.execute(
        select(func.count()).select_from(base_query.subquery())
    )
    total = count_result.scalar()
    
    offset = (page - 1) * page_size
    query = base_query.offset(offset).limit(page_size).order_by(ParsedResume.created_at.desc())
    result = await session.execute(query)
    items = result.scalars().all()
    
    total_pages = (total + page_size - 1) // page_size
    
    return PaginatedParsedResumesResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_previous=page > 1
    )

@router.get("/{resume_id}", response_model=ParsedResumeResponse)
async def get_parsed_resume_by_resume_id(
    resume_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        select(ParsedResume).where(ParsedResume.resume_id == resume_id)
    )
    parsed_resume = result.scalar_one_or_none()
    if not parsed_resume:
        raise HTTPException(
            status_code=404,
            detail="Parsed resume data not found for this resume. The AI might still be processing it."
        )
    return parsed_resume

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
    await session.flush()
    return {
        "message": "Status updated successfully",
        "candidate_status": parsed_resume.candidate_status
    }

@router.patch("/{parsed_resume_id}")
async def update_parsed_resume(
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
    await session.flush()
    return {
        "message": "Status updated successfully",
        "id": str(parsed_resume.id),
        "candidate_status": parsed_resume.candidate_status
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
    await session.flush()
    return {
        "message": "Parsed resume deleted successfully",
        "id": str(parsed_resume_id)
    }