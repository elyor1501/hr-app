import logging
from typing import List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from services.embeddings.service import EmbeddingService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/match-candidates", tags=["Matching"])

# Module-level singleton mirrors the pattern in embeddings.py — keeps the local
# sentence-transformer model warm across requests.
_embedding_service = EmbeddingService()


class MatchRequest(BaseModel):
    job_description: str = Field(..., min_length=1)
    top_k: int = Field(default=10, ge=1, le=50)


class MatchResponse(BaseModel):
    embedding: List[float]


# Stateless inference endpoint: turns JD text into a 768-dim vector. The caller
# (backend) runs the pgvector cosine query against candidates.embedding using its
# own DB session — AI-ML must not hold DB credentials.
@router.post("", response_model=MatchResponse)
async def match_candidates(payload: MatchRequest):
    try:
        embedding = _embedding_service.get_embedding(payload.job_description)
    except Exception as exc:
        logger.exception("jd_embedding_failed")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {exc}")

    logger.info("match_candidates_embedded", extra={"dimension": len(embedding)})
    return MatchResponse(embedding=embedding)
