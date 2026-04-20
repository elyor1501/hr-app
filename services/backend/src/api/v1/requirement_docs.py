import json
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from src.db.session import get_db_session
from src.services.storage import upload_requirement_doc, delete_requirement_doc_from_storage
from src.core.redis import get_redis_pool
from pydantic import BaseModel

router = APIRouter()

CACHE_KEY = "hr_app:requirement_docs:list"
CACHE_TTL = 60
ALLOWED_TYPES = ["pdf", "doc", "docx"]


class RequirementDocResponse(BaseModel):
    id: str
    file_name: str
    file_url: str
    created_at: Optional[str]
    updated_at: Optional[str]

    class Config:
        from_attributes = True


async def invalidate_cache():
    try:
        redis = await get_redis_pool()
        keys = await redis.keys("hr_app:requirement_docs:*")
        if keys:
            await redis.delete(*keys)
    except Exception:
        pass


@router.post("/upload", response_model=RequirementDocResponse, status_code=status.HTTP_201_CREATED)
async def upload_requirement_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db_session),
):
    filename = file.filename or "document.pdf"
    file_ext = filename.split(".")[-1].lower()

    if file_ext not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(ALLOWED_TYPES)}"
        )

    public_url = await upload_requirement_doc(file)

    if not public_url:
        raise HTTPException(status_code=500, detail="Failed to upload file to storage")

    result = await session.execute(
        text("""
            INSERT INTO requirement_documents (file_name, file_url)
            VALUES (:file_name, :file_url)
            RETURNING id, file_name, file_url, created_at, updated_at
        """),
        {"file_name": filename, "file_url": public_url}
    )
    await session.commit()
    row = result.fetchone()

    await invalidate_cache()

    return {
        "id": str(row.id),
        "file_name": row.file_name,
        "file_url": row.file_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }


@router.get("/", response_model=List[RequirementDocResponse])
async def list_requirement_documents(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"{CACHE_KEY}:{skip}:{limit}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    result = await session.execute(
        text("""
            SELECT id, file_name, file_url, created_at, updated_at
            FROM requirement_documents
            ORDER BY created_at DESC
            OFFSET :skip LIMIT :limit
        """),
        {"skip": skip, "limit": limit}
    )
    rows = result.fetchall()

    docs = [
        {
            "id": str(row.id),
            "file_name": row.file_name,
            "file_url": row.file_url,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in rows
    ]

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, CACHE_TTL, json.dumps(docs))
    except Exception:
        pass

    return docs


@router.get("/{id}", response_model=RequirementDocResponse)
async def get_requirement_document(
    id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    cache_key = f"hr_app:requirement_doc:{id}"

    try:
        redis = await get_redis_pool()
        cached = await redis.get(cache_key)
        if cached:
            return json.loads(cached)
    except Exception:
        pass

    result = await session.execute(
        text("""
            SELECT id, file_name, file_url, created_at, updated_at
            FROM requirement_documents
            WHERE id = :id
        """),
        {"id": str(id)}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Requirement document not found")

    response = {
        "id": str(row.id),
        "file_name": row.file_name,
        "file_url": row.file_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
    }

    try:
        redis = await get_redis_pool()
        await redis.setex(cache_key, CACHE_TTL, json.dumps(response))
    except Exception:
        pass

    return response


@router.delete("/{id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_requirement_document(
    id: UUID,
    session: AsyncSession = Depends(get_db_session),
):
    result = await session.execute(
        text("SELECT file_url FROM requirement_documents WHERE id = :id"),
        {"id": str(id)}
    )
    row = result.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Requirement document not found")

    await delete_requirement_doc_from_storage(row.file_url)

    await session.execute(
        text("DELETE FROM requirement_documents WHERE id = :id"),
        {"id": str(id)}
    )
    await session.commit()

    await invalidate_cache()