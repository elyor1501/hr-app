from fastapi import APIRouter, HTTPException, Request
from typing import List

from schemas.requests import EmbeddingRequest, BatchEmbeddingRequest
from schemas.responses import EmbeddingResponse, BatchEmbeddingResponse
from services.embeddings.service import EmbeddingService
from services.embeddings.rate_limiter import RateLimiter


router = APIRouter(prefix="/embeddings", tags=["Embeddings"])

embedding_service = EmbeddingService()
rate_limiter = RateLimiter()

EXPECTED_DIMENSION = 3072   # Updated to match Gemini model
MAX_BATCH_SIZE = 100

@router.post("/embed", response_model=EmbeddingResponse)
async def embed_text(request: Request, body: EmbeddingRequest):

    client_ip = request.client.host
    rate_limiter.check(client_ip)

    if not body.text or not body.text.strip():
        raise HTTPException(
            status_code=400,
            detail="Text cannot be empty"
        )

    try:
        # Updated method call
        embedding = embedding_service.get_embedding(body.text)

        if len(embedding) != EXPECTED_DIMENSION:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid embedding dimension. Expected {EXPECTED_DIMENSION}"
            )

        return EmbeddingResponse(
            dimension=len(embedding),
            embedding=embedding,
            provider="gemini"
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/embed-batch", response_model=BatchEmbeddingResponse)
async def embed_batch(request: Request, body: BatchEmbeddingRequest):

    client_ip = request.client.host
    rate_limiter.check(client_ip)

    if not body.texts:
        raise HTTPException(
            status_code=400,
            detail="Texts list cannot be empty"
        )

    if len(body.texts) > MAX_BATCH_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"Batch size cannot exceed {MAX_BATCH_SIZE}"
        )

    for text in body.texts:
        if not text or not text.strip():
            raise HTTPException(
                status_code=400,
                detail="Batch contains empty text"
            )

    try:
        # ✅ Use batch method directly
        embeddings: List[List[float]] = embedding_service.get_embeddings(body.texts)

        for emb in embeddings:
            if len(emb) != EXPECTED_DIMENSION:
                raise HTTPException(
                    status_code=500,
                    detail=f"Invalid embedding dimension. Expected {EXPECTED_DIMENSION}"
                )

        return BatchEmbeddingResponse(
            dimension=EXPECTED_DIMENSION,
            count=len(embeddings),
            embeddings=embeddings,
            providers=["gemini"] * len(embeddings)
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))