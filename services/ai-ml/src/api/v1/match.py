from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import traceback

from services.rag.match_service import MatchService


router = APIRouter(prefix="/match", tags=["RAG Match"])


class MatchRequest(BaseModel):
    job_descriptions: List[str]
    candidates: List[Dict[str, Any]]


match_service = MatchService()


@router.post("")
async def match_candidates(payload: MatchRequest):
    try:
        result = await match_service.match_candidates(
            job_descriptions=payload.job_descriptions,
            candidates=payload.candidates
        )
        return {"results": result}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"RAG match failed: {str(e)}"
        )