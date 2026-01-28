from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.session import get_db_session
from src.models.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
)
from src.repositories.candidate import CandidateRepository
from src.services.files import FileService

router = APIRouter()
file_service = FileService()


def get_repository(session: AsyncSession = Depends(get_db_session)) -> CandidateRepository:
    return CandidateRepository(session)


@router.post(
    "/",
    response_model=CandidateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new candidate",
)
async def create_candidate(
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    current_title: Optional[str] = Form(None),
    current_company: Optional[str] = Form(None),
    years_of_experience: Optional[int] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    resume: Optional[UploadFile] = File(None),
    repo: CandidateRepository = Depends(get_repository),
):
    """
    Create a new candidate. 
    Checks database for existing email before saving any files.
    """
    
    # 1. Database Check First (Prevent orphaned files)
    existing = await repo.get_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Candidate with this email already exists"
        )

    # 2. Validate Text Data with Pydantic
    try:
        candidate_in = CandidateCreate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            current_title=current_title,
            current_company=current_company,
            years_of_experience=years_of_experience,
            linkedin_url=linkedin_url
        )
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=e.errors())

    # 3. Handle File Upload (Only after validation and DB check pass)
    candidate_data = candidate_in.model_dump()
    if resume:
        resume_path = await file_service.save_cv(resume)
        candidate_data["resume_url"] = resume_path

    # 4. Save to Database
    return await repo.create(**candidate_data)


@router.get("/", response_model=List[CandidateResponse])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    repo: CandidateRepository = Depends(get_repository),
):
    """List candidates with pagination."""
    return await repo.get_all(skip=skip, limit=limit)


@router.get("/{id}", response_model=CandidateResponse)
async def get_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
    """Get a candidate by ID."""
    candidate = await repo.get_by_id(id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


@router.patch("/{id}", response_model=CandidateResponse)
async def update_candidate(
    id: UUID,
    update_data: CandidateUpdate,
    repo: CandidateRepository = Depends(get_repository),
):
    """Update a candidate."""
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Candidate not found")
    
    updated = await repo.update(id, **update_data.model_dump(exclude_unset=True))
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
    """Delete a candidate."""
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")