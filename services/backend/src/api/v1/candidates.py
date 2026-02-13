import random
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.db.session import get_db_session
from src.models.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
)
from src.models.enums import CandidateStatus
from src.repositories.candidate import CandidateRepository
from src.services import upload_file


router = APIRouter()

ALLOWED_CONTENT_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]


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
    location: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    skills: Optional[str] = Form(None),
    status_field: str = Form("active", alias="status"),
    resume: Optional[UploadFile] = File(None),
    repo: CandidateRepository = Depends(get_repository),
):
    existing = await repo.get_by_email(email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate with this email already exists"
        )

    candidate_data = {
        "first_name": first_name.strip().title(),
        "last_name": last_name.strip().title(),
        "email": email,
        "phone": phone,
        "current_title": current_title,
        "current_company": current_company,
        "years_of_experience": years_of_experience,
        "location": location,
        "linkedin_url": linkedin_url,
        "status": status_field if status_field in ["active", "inactive"] else "active",
    }

    if skills:
        candidate_data["skills"] = [s.strip().lower() for s in skills.split(",") if s.strip()]

    candidate_data["embedding"] = [
        random.uniform(-1, 1) for _ in range(settings.vector_dimension)
    ]

    # --- UPLOAD RESUME TO SUPABASE STORAGE ---
    if resume:
        if resume.content_type not in ALLOWED_CONTENT_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid file type. Only PDF and Word documents are allowed."
            )
        
        # Upload using service
        try:
            resume_url = await upload_file(resume)
            if resume_url:
                candidate_data["resume"] = resume_url
        except Exception as e:
            print(f"Resume upload failed: {e}")
            # Continue without resume if upload fails, or raise error
            # raise HTTPException(500, detail="Resume upload failed")

    return await repo.create(**candidate_data)


@router.get("/", response_model=List[CandidateResponse])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    repo: CandidateRepository = Depends(get_repository),
):
    return await repo.get_all(skip=skip, limit=limit)


@router.get("/{id}", response_model=CandidateResponse)
async def get_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
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
    if not await repo.exists(id):
        raise HTTPException(status_code=404, detail="Candidate not found")

    updated = await repo.update(id, **update_data.model_dump(exclude_unset=True))
    return updated


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_candidate(
    id: UUID,
    repo: CandidateRepository = Depends(get_repository),
):
    deleted = await repo.delete(id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Candidate not found")