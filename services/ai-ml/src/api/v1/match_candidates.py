import logging
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import text

from db.session import async_session_maker
from services.embeddings.service import EmbeddingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/match-candidates", tags=["Matching"])

# Module-level singleton mirrors the pattern in embeddings.py — keeps the local
# sentence-transformer model warm across requests.
_embedding_service = EmbeddingService()


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=50)


class MatchItem(BaseModel):
    candidate_id: str
    similarity: float


class MatchResponse(BaseModel):
    matches: List[MatchItem]
    total_evaluated: int


@router.post("", response_model=MatchResponse)
async def match_candidates(payload: MatchRequest):
    try:
        jd_vec = _embedding_service.get_embedding(payload.job_description)
    except Exception as exc:
        logger.exception("jd_embedding_failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    # pgvector requires the literal as a bracketed string when cast to vector type.
    vec_literal = "[" + ",".join(f"{x:.8f}" for x in jd_vec) + "]"

    async with async_session_maker() as session:
        # `<=>` is cosine distance (0 = identical). Convert to similarity for the UI.
        rows = (await session.execute(
            text(
                """
                SELECT
                    id AS candidate_id,
                    1 - (embedding <=> CAST(:jd_vec AS vector)) AS similarity
                FROM candidates
                WHERE embedding IS NOT NULL AND status = 'active'
                ORDER BY embedding <=> CAST(:jd_vec AS vector)
                LIMIT :top_k
                """
            ),
            {"jd_vec": vec_literal, "top_k": payload.top_k},
        )).fetchall()

        total = (await session.execute(
            text(
                "SELECT COUNT(*) FROM candidates "
                "WHERE embedding IS NOT NULL AND status = 'active'"
            )
        )).scalar() or 0

    matches = [
        MatchItem(candidate_id=str(row.candidate_id), similarity=float(row.similarity))
        for row in rows
    ]

    logger.info(
        "match_candidates_complete",
        extra={"returned": len(matches), "total_evaluated": total, "top_k": payload.top_k},
    )

    return MatchResponse(matches=matches, total_evaluated=total)
