from __future__ import annotations

from typing import List, Optional, Dict, Any

from pydantic import Field, field_validator, model_validator

from src.models.base import (
    BaseSchema,
    EmbeddingMixin,
    IDSchema,
    TimestampSchema,
    validate_phone_number,
)
from src.models.enums import CandidateStatus


class CandidateBase(BaseSchema):
    first_name: str = Field(..., min_length=1)
    last_name: Optional[str] = Field(default="")
    email: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None)
    current_title: Optional[str] = Field(default=None)
    current_company: Optional[str] = Field(default=None)
    years_of_experience: Optional[int] = Field(default=None, ge=0)
    skills: Optional[List[str]] = Field(default=None)
    resume_text: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    linkedin_url: Optional[str] = Field(default=None)
    resume: Optional[str] = Field(default=None)
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
            return v
        return v

    @model_validator(mode="after")
    def validate_names(self) -> CandidateBase:
        self.first_name = self.first_name.strip().title()
        if self.last_name:
            self.last_name = self.last_name.strip().title()
        else:
            self.last_name = ""
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
    experience_level: Optional[str] = None
    hourly_rate: Optional[float] = None
    availability: Optional[str] = None
    resume: Optional[str] = None
    json_data: Optional[Dict[str, Any]] = None
    daily_rate: Optional[float] = None
    rate_type: Optional[str] = None
    currency: Optional[str] = None
    vendor: Optional[str] = None
    proposed_rate: Optional[float] = None
    proposed_rate_type: Optional[str] = None
    proposed_daily_rate: Optional[float] = None
    proposed_currency: Optional[str] = None
    dob: Optional[str] = None
    ssn_last4: Optional[str] = None
    work_authorization: Optional[str] = None
    interview_availability: Optional[str] = None
    willing_to_travel: Optional[bool] = None
    willing_inperson: Optional[bool] = None
    us_experience: Optional[int] = None
    pending_offers: Optional[bool] = None
    pending_offers_details: Optional[str] = None

    @field_validator("status", mode="before")
    @classmethod
    def validate_status(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        if v not in ["active", "inactive"]:
            raise ValueError("Status must be active or inactive")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        return validate_phone_number(v)

    @field_validator("rate_type", "proposed_rate_type", mode="before")
    @classmethod
    def validate_rate_type(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        allowed = ["hourly", "daily", "weekly", "monthly"]
        if v.lower() not in allowed:
            return None
        return v.lower()


class CandidateResponse(CandidateBase, IDSchema, TimestampSchema):
    status: CandidateStatus = Field(...)
    experience_level: Optional[str] = None
    hourly_rate: Optional[float] = None
    availability: Optional[str] = None
    daily_rate: Optional[float] = None
    rate_type: Optional[str] = None
    currency: Optional[str] = None
    vendor: Optional[str] = None
    proposed_rate: Optional[float] = None
    proposed_rate_type: Optional[str] = None
    proposed_daily_rate: Optional[float] = None
    proposed_currency: Optional[str] = None
    dob: Optional[str] = None
    ssn_last4: Optional[str] = None
    work_authorization: Optional[str] = None
    interview_availability: Optional[str] = None
    willing_to_travel: Optional[bool] = None
    willing_inperson: Optional[bool] = None
    us_experience: Optional[int] = None
    pending_offers: Optional[bool] = None
    pending_offers_details: Optional[str] = None


class CandidateInDB(CandidateResponse, EmbeddingMixin):
    pass


class CandidateList(BaseSchema):
    items: List[CandidateResponse]
    total: int
    page: int
    size: int
    pages: int