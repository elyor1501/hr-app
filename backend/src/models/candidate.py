# D:\hr-app\services\backend\src\models\candidate.py

from __future__ import annotations

import re
from typing import List, Optional

from pydantic import EmailStr, Field, field_validator, model_validator

from src.models.base import (
    BaseSchema,
    EmbeddingMixin,
    IDSchema,
    TimestampSchema,
    validate_phone_number,
)
from src.models.enums import CandidateStatus


class CandidateBase(BaseSchema):
    """Base candidate fields shared across all candidate models."""

    first_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Candidate's first name",
    )
    last_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Candidate's last name",
    )
    email: EmailStr = Field(
        ...,
        description="Candidate's email address",
    )
    phone: Optional[str] = Field(
        default=None,
        description="Candidate's phone number",
    )
    current_title: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Current job title",
    )
    current_company: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Current employer",
    )
    years_of_experience: Optional[int] = Field(
        default=None,
        ge=0,
        le=50,
        description="Total years of professional experience",
    )
    skills: Optional[List[str]] = Field(
        default=None,
        description="List of candidate's skills",
    )
    resume_text: Optional[str] = Field(
        default=None,
        max_length=50000,
        description="Parsed resume text content",
    )
    resume_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="URL to stored resume file",
    )
    location: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Candidate's location",
    )
    linkedin_url: Optional[str] = Field(
        default=None,
        max_length=500,
        description="LinkedIn profile URL",
    )
    notes: Optional[str] = Field(
        default=None,
        max_length=5000,
        description="Internal notes about the candidate",
    )

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        return validate_phone_number(v)

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        """Normalize skills to lowercase and remove duplicates."""
        if v is None:
            return None
        normalized = [skill.strip().lower() for skill in v if skill.strip()]
        seen = set()
        unique = []
        for skill in normalized:
            if skill not in seen:
                seen.add(skill)
                unique.append(skill)
        return unique if unique else None

    @field_validator("linkedin_url")
    @classmethod
    def validate_linkedin_url(cls, v: Optional[str]) -> Optional[str]:
        """Validate LinkedIn URL format."""
        if v is None:
            return None
        if not re.match(r"^https?://(www\.)?linkedin\.com/.*$", v):
            raise ValueError("Invalid LinkedIn URL format")
        return v

    @model_validator(mode="after")
    def validate_names(self) -> CandidateBase:
        """Capitalize first and last names."""
        self.first_name = self.first_name.strip().title()
        self.last_name = self.last_name.strip().title()
        return self


class CandidateCreate(CandidateBase):
    """Schema for creating a new candidate."""

    status: CandidateStatus = Field(
        default=CandidateStatus.NEW,
        description="Initial status of the candidate",
    )


class CandidateUpdate(BaseSchema):
    """Schema for updating a candidate. All fields optional."""

    first_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    email: Optional[EmailStr] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    current_title: Optional[str] = Field(default=None, max_length=200)
    current_company: Optional[str] = Field(default=None, max_length=200)
    years_of_experience: Optional[int] = Field(default=None, ge=0, le=50)
    skills: Optional[List[str]] = Field(default=None)
    resume_text: Optional[str] = Field(default=None, max_length=50000)
    resume_url: Optional[str] = Field(default=None, max_length=500)
    location: Optional[str] = Field(default=None, max_length=200)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    notes: Optional[str] = Field(default=None, max_length=5000)
    status: Optional[CandidateStatus] = Field(default=None)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        """Validate phone number format."""
        return validate_phone_number(v)


class CandidateResponse(CandidateBase, IDSchema, TimestampSchema):
    """Schema for candidate response."""

    status: CandidateStatus = Field(
        ...,
        description="Current status in hiring pipeline",
    )


class CandidateInDB(CandidateResponse, EmbeddingMixin):
    """Schema for candidate stored in database."""

    pass


class CandidateList(BaseSchema):
    """Schema for paginated list of candidates."""

    items: List[CandidateResponse] = Field(..., description="List of candidates")
    total: int = Field(..., ge=0, description="Total number of candidates")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")