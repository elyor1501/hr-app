from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db_session
from src.services.ai_client import AIClient
from src.repositories.candidate import CandidateRepository
from src.repositories.job import JobRepository
from src.models.search import MatchResponse, MatchRequest

router = APIRouter()
ai_client = AIClient()

@router.post("/match", response_model=MatchResponse)
async def match_candidate_to_job(
    request: MatchRequest,
    db: AsyncSession = Depends(get_db_session)
):
    """
    ## Calculate Candidate-Job Compatibility
    This endpoint calculates a weighted match score based on three main pillars:
    
    1. **Skills Match (50% weight):** Compares extracted candidate skills against job requirements.
    2. **Experience Match (30% weight):** Evaluates years of experience and previous job titles.
    3. **Education & Level (20% weight):** Checks if seniority levels and education background align.
    
    The reasoning field provides a natural language explanation for the generated scores.
    """
    cand_repo = CandidateRepository(db)
    job_repo = JobRepository(db)
    
    candidate = await cand_repo.get_by_id(request.candidate_id)
    job = await job_repo.get_by_id(request.job_id)
    
    if not candidate or not job:
        raise HTTPException(status_code=404, detail="Candidate or Job not found")
    
    # Call AI service (using our new Fallback logic)
    match_data = await ai_client.calculate_match(
        resume_text=candidate.resume_text or "",
        job_description=job.description
    )
    
    return MatchResponse(**match_data)