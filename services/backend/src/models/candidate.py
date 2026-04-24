from __future__ import annotations

import re
from typing import List, Optional, Dict, Any

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
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    current_title: Optional[str] = Field(default=None, max_length=200)
    current_company: Optional[str] = Field(default=None, max_length=200)
    years_of_experience: Optional[int] = Field(default=None, ge=0, le=50)
    skills: Optional[List[str]] = Field(default=None)
    resume_text: Optional[str] = Field(default=None, max_length=50000)
    location: Optional[str] = Field(default=None, max_length=200)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    resume: Optional[str] = Field(default=None, description="URL to resume file")
    json_data: Optional[Dict[str, Any]] = Field(default=None)

    @field_validator("email", mode="before")
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if not v or not v.strip():
            return None
        if "@" not in v:
            return None
        if "@placeholder.com" in v:
            return None
        if "@noemail.vaspp.com" in v:
            return None
        if v.startswith("unknown_"):
            return None
        return v.strip()

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)

    @field_validator("skills", mode="before")
    @classmethod
    def normalize_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        return list(set([skill.strip().lower() for skill in v if skill.strip()]))

    @field_validator("linkedin_url")
    @classmethod
    def validate_linkedin_url(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        if v.startswith("http") and "linkedin.com" not in v:
            raise ValueError("Invalid LinkedIn URL format")
        return v

    @model_validator(mode="after")
    def validate_names(self) -> CandidateBase:
        self.first_name = self.first_name.strip().title()
        self.last_name = self.last_name.strip().title()
        return self


class CandidateCreate(CandidateBase):
    status: CandidateStatus = Field(default=CandidateStatus.ACTIVE)


class CandidateUpdate(BaseSchema):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    current_title: Optional[str] = None
    current_company: Optional[str] = None
    years_of_experience: Optional[int] = None
    skills: Optional[List[str]] = None
    resume_text: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    status: Optional[CandidateStatus] = None
    resume: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)


class CandidateResponse(CandidateBase, IDSchema, TimestampSchema):
    status: CandidateStatus = Field(...)


class CandidateInDB(CandidateResponse, EmbeddingMixin):
    pass


class CandidateList(BaseSchema):
    items: List[CandidateResponse]
    total: int
    page: int
    size: int
    pages: int