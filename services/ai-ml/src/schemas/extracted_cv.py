from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Dict, Any, List, Optional


class EducationItem(BaseModel):
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    institution: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None


class ExperienceItem(BaseModel):
    job_title: Optional[str] = None
    company: Optional[str] = None
    location: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    responsibilities: List[str] = []


class ProjectItem(BaseModel):
    project_name: Optional[str] = None
    description: Optional[str] = None
    technologies: List[str] = []


class ConfidenceScores(BaseModel):
    full_name: Optional[float] = 0.8
    email: Optional[float] = 0.8
    phone: Optional[float] = 0.8
    location: Optional[float] = 0.8
    skills: Optional[float] = 0.8
    education: Optional[float] = 0.8
    experience: Optional[float] = 0.8
    projects: Optional[float] = 0.8
    overall: Optional[float] = 0.8


class ExtractedCV(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    portfolio: Optional[str] = None
    summary: Optional[str] = None
    skills: List[str] = []
    education: List[EducationItem] = []
    experience: List[ExperienceItem] = []
    projects: List[ProjectItem] = []
    certifications: List[str] = []
    confidence_scores: ConfidenceScores = Field(default_factory=ConfidenceScores)
    confidence_score: float = Field(default=0.8, ge=0.0, le=1.0)
    extraction_latency: float = 0.0

    @field_validator("skills", mode="before")
    @classmethod
    def normalise_skills(cls, v):
        if not isinstance(v, list):
            return []
        return [str(s).strip() for s in v if s]

    @field_validator("education", mode="before")
    @classmethod
    def normalise_education(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"institution": item.strip()})
        return result

    @field_validator("experience", mode="before")
    @classmethod
    def normalise_experience(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"job_title": item.strip()})
        return result

    @field_validator("projects", mode="before")
    @classmethod
    def normalise_projects(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, dict):
                result.append(item)
            elif isinstance(item, str) and item.strip():
                result.append({"project_name": item.strip()})
        return result

    @field_validator("certifications", mode="before")
    @classmethod
    def normalise_certifications(cls, v):
        if not isinstance(v, list):
            return []
        result = []
        for item in v:
            if isinstance(item, str) and item.strip():
                result.append(item.strip())
            elif isinstance(item, dict):
                # extract the first string value found in the dict
                name = item.get("name") or item.get("title") or item.get("certification") or ""
                if name:
                    result.append(str(name).strip())
        return result
