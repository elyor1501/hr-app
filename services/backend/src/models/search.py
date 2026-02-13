from typing import List, Optional
from uuid import UUID
from pydantic import Field
from src.models.base import BaseSchema
from src.models.candidate import CandidateResponse
from src.models.enums import CandidateStatus

class SemanticSearchRequest(BaseSchema):
    query: str = Field(..., min_length=2)
    limit: int = Field(default=10, ge=1, le=50)
    min_score: float = Field(default=0.3, ge=0.0, le=1.0)
    status: Optional[CandidateStatus] = None

class CandidateSearchResponse(CandidateResponse):
    similarity_score: float

class MatchRequest(BaseSchema):
    candidate_id: UUID
    job_id: UUID

class MatchResponse(BaseSchema):
    overall_score: float
    skills_score: float
    experience_score: float
    reasoning: Optional[str] = None