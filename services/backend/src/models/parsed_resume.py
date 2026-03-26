from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import Field
from src.models.base import BaseSchema

class ParsedResumeResponse(BaseSchema):
    id: UUID
    resume_id: UUID
    created_at: datetime
    updated_at: datetime
    
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    education: Optional[List[Dict[str, Any]]] = None
    experience: Optional[List[Dict[str, Any]]] = None
    projects: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    confidence_scores: Optional[Dict[str, Any]] = None
    confidence_score: Optional[float] = None
    extraction_latency: Optional[float] = None
    json_data: Optional[Dict[str, Any]] = None
    candidate_status: str = "active"