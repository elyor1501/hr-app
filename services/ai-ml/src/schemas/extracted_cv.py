from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class ExperienceItem(BaseModel):
    company: Optional[str]
    role: Optional[str]
    duration: Optional[str]
    description: Optional[str]


class EducationItem(BaseModel):
    institution: Optional[str]
    degree: Optional[str]
    year: Optional[str]


class ExtractedCV(BaseModel):
    name: str
    email: Optional[EmailStr]
    phone: Optional[str]
    skills: List[str]
    experience: List[ExperienceItem]
    education: List[EducationItem]
    confidence: float = Field(ge=0.0, le=1.0)
