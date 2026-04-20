import hashlib
from typing import List, Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import Candidate, CandidateCV, CandidateAttachment
from src.db.session import get_db_session
from src.services.storage import upload_file, delete_file_from_storage

logger = structlog.get_logger()
router = APIRouter()

ALLOWED_CV_TYPES = ["application/pdf", "application/msword",
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

ALLOWED_ATTACHMENT_TYPES = [
    "Certification", "Portfolio", "Qualification",
    "License", "Cover Letter", "Reference Letter", "Other"
]


class CVResponse(BaseModel):
    id: str
    candidate_id: str
    file_name: str
    file_url: str
    is_primary: bool
    file_size: Optional[int] = None
    created_at: str

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    id: str
    candidate_id: str
    file_name: str
    file_url: str
    attachment_type: str
    file_size: Optional[int] = None
    created_at: str

    class Config:
        from_attributes = True


async def _get_candidate_or_404(session: AsyncSession, candidate_id: UUID) -> Candidate:
    candidate = await session.get(Candidate, candidate_id)
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate not found")
    return candidate


def _cv_to_response(cv: CandidateCV) -> CVResponse:
    return CVResponse(
        id=str(cv.id),
        candidate_id=str(cv.candidate_id),
        file_name=cv.file_name,
        file_url=cv.file_url,
        is_primary=cv.is_primary,
        file_size=cv.file_size,
        created_at=cv.created_at.isoformat(),
    )


def _attachment_to_response(att: CandidateAttachment) -> AttachmentResponse:
    return AttachmentResponse(
        id=str(att.id),
        candidate_id=str(att.candidate_id),
        file_name=att.file_name,
        file_url=att.file_url,
        attachment_type=att.attachment_type,
        file_size=att.file_size,
        created_at=att.created_at.isoformat(),
    )


@router.get("/{candidate_id}/cvs", response_model=List[CVResponse])
async def list_cvs(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateCV)
        .where(CandidateCV.candidate_id == candidate_id)
        .order_by(CandidateCV.is_primary.desc(), CandidateCV.created_at.desc())
    )
    cvs = result.scalars().all()
    return [_cv_to_response(cv) for cv in cvs]


@router.post("/{candidate_id}/cvs", response_model=CVResponse, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    candidate_id: UUID,
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    if file.content_type not in ALLOWED_CV_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only PDF and Word documents are allowed."
        )

    file_content = await file.read()
    file_hash = hashlib.sha256(file_content).hexdigest()

    existing_hash = await session.execute(
        select(CandidateCV).where(
            and_(
                CandidateCV.candidate_id == candidate_id,
                CandidateCV.file_hash == file_hash
            )
        )
    )
    if existing_hash.scalar_one_or_none():
        raise HTTPException(
            status_code=409,
            detail="This exact CV has already been uploaded for this candidate."
        )

    from io import BytesIO
    from fastapi import UploadFile as FU
    file.file = BytesIO(file_content)
    file_url = await upload_file(file)

    if not file_url:
        raise HTTPException(status_code=500, detail="File upload failed")

    existing_cvs = await session.execute(
        select(func.count(CandidateCV.id)).where(CandidateCV.candidate_id == candidate_id)
    )
    cv_count = existing_cvs.scalar() or 0
    is_primary = cv_count == 0

    cv = CandidateCV(
        candidate_id=candidate_id,
        file_name=file.filename or "cv.pdf",
        file_url=file_url,
        file_hash=file_hash,
        is_primary=is_primary,
        file_size=len(file_content),
    )
    session.add(cv)
    await session.commit()
    await session.refresh(cv)

    return _cv_to_response(cv)


@router.patch("/{candidate_id}/cvs/{cv_id}/set-primary", response_model=CVResponse)
async def set_primary_cv(
    candidate_id: UUID,
    cv_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    target_cv = await session.execute(
        select(CandidateCV).where(
            and_(CandidateCV.id == cv_id, CandidateCV.candidate_id == candidate_id)
        )
    )
    cv = target_cv.scalar_one_or_none()

    if not cv:
        raise HTTPException(status_code=404, detail="CV not found for this candidate")

    all_cvs = await session.execute(
        select(CandidateCV).where(CandidateCV.candidate_id == candidate_id)
    )
    for existing_cv in all_cvs.scalars().all():
        existing_cv.is_primary = existing_cv.id == cv_id

    await session.commit()
    await session.refresh(cv)

    return _cv_to_response(cv)


@router.delete("/{candidate_id}/cvs/{cv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_cv(
    candidate_id: UUID,
    cv_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    count_result = await session.execute(
        select(func.count(CandidateCV.id)).where(CandidateCV.candidate_id == candidate_id)
    )
    cv_count = count_result.scalar() or 0

    if cv_count <= 1:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete the only CV. A candidate must have at least 1 CV."
        )

    cv_result = await session.execute(
        select(CandidateCV).where(
            and_(CandidateCV.id == cv_id, CandidateCV.candidate_id == candidate_id)
        )
    )
    cv = cv_result.scalar_one_or_none()

    if not cv:
        raise HTTPException(status_code=404, detail="CV not found for this candidate")

    was_primary = cv.is_primary

    try:
        await delete_file_from_storage(cv.file_url)
    except Exception:
        pass

    await session.delete(cv)
    await session.flush()

    if was_primary:
        next_cv_result = await session.execute(
            select(CandidateCV)
            .where(CandidateCV.candidate_id == candidate_id)
            .order_by(CandidateCV.created_at.desc())
            .limit(1)
        )
        next_cv = next_cv_result.scalar_one_or_none()
        if next_cv:
            next_cv.is_primary = True

    await session.commit()


@router.get("/{candidate_id}/attachments", response_model=List[AttachmentResponse])
async def list_attachments(
    candidate_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateAttachment)
        .where(CandidateAttachment.candidate_id == candidate_id)
        .order_by(CandidateAttachment.created_at.desc())
    )
    attachments = result.scalars().all()
    return [_attachment_to_response(att) for att in attachments]


@router.post("/{candidate_id}/attachments", response_model=AttachmentResponse, status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    candidate_id: UUID,
    attachment_type: str = Form(...),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    if attachment_type not in ALLOWED_ATTACHMENT_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid attachment type. Must be one of: {ALLOWED_ATTACHMENT_TYPES}"
        )

    file_content = await file.read()

    from io import BytesIO
    file.file = BytesIO(file_content)
    file_url = await upload_file(file)

    if not file_url:
        raise HTTPException(status_code=500, detail="File upload failed")

    attachment = CandidateAttachment(
        candidate_id=candidate_id,
        file_name=file.filename or "attachment",
        file_url=file_url,
        attachment_type=attachment_type,
        file_size=len(file_content),
    )
    session.add(attachment)
    await session.commit()
    await session.refresh(attachment)

    return _attachment_to_response(attachment)


@router.delete("/{candidate_id}/attachments/{attachment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_attachment(
    candidate_id: UUID,
    attachment_id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    await _get_candidate_or_404(session, candidate_id)

    result = await session.execute(
        select(CandidateAttachment).where(
            and_(
                CandidateAttachment.id == attachment_id,
                CandidateAttachment.candidate_id == candidate_id
            )
        )
    )
    attachment = result.scalar_one_or_none()

    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found for this candidate")

    try:
        await delete_file_from_storage(attachment.file_url)
    except Exception:
        pass

    await session.delete(attachment)
    await session.commit()