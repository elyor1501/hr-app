from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db_session
from src.db.models import ParsedResume
from src.repositories.base import BaseRepository
from src.models.parsed_resume import ParsedResumeResponse

router = APIRouter()

def get_repository(session: AsyncSession = Depends(get_db_session)) -> BaseRepository[ParsedResume]:
    return BaseRepository(ParsedResume, session)

@router.get("/", response_model=List[ParsedResumeResponse])
async def list_parsed_resumes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    repo: BaseRepository[ParsedResume] = Depends(get_repository),
):
    """List all AI-parsed resumes."""
    return await repo.get_all(skip=skip, limit=limit)

@router.get("/{resume_id}", response_model=ParsedResumeResponse)
async def get_parsed_resume_by_resume_id(
    resume_id: UUID,
    repo: BaseRepository[ParsedResume] = Depends(get_repository),
):
    """Get the AI-parsed structured data for a specific uploaded resume ID."""
    # We use get_by_field because the ID we pass from the frontend is usually the 'resume_id', not the 'id' of this specific table.
    parsed_resume = await repo.get_by_field("resume_id", resume_id)
    if not parsed_resume:
        raise HTTPException(status_code=404, detail="Parsed resume data not found for this resume. The AI might still be processing it.")
    return parsed_resume