from typing import List
from fastapi import APIRouter, Depends, HTTPException
from src.services.ai_client import AIClient
from src.repositories.candidate import CandidateRepository
from src.models.search import SemanticSearchRequest, CandidateSearchResponse
from src.db.session import get_db_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
ai_client = AIClient()

@router.post("/candidates", response_model=List[CandidateSearchResponse])
async def search_candidates(
    request: SemanticSearchRequest,
    db: AsyncSession = Depends(get_db_session)
):
    repo = CandidateRepository(db)
    
    # 1. Convert text query to vector
    query_vector = await ai_client.get_embeddings(request.query)
    
    # 2. Perform vector search
    results = await repo.semantic_search(
        query_embedding=query_vector,
        limit=request.limit,
        status=request.status
    )
    
    # 3. Format response
    output = []
    for cand, score in results:
        if score >= request.min_score:
            cand_dict = cand.to_dict()
            cand_dict["similarity_score"] = round(float(score), 3)
            output.append(CandidateSearchResponse(**cand_dict))
            
    return output