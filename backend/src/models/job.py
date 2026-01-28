from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import Field, field_validator, model_validator

from src.models.base import (
    BaseSchema,
    EmbeddingMixin,
    IDSchema,
    TimestampSchema,
)
from src.models.enums import ExperienceLevel, JobStatus, JobType


class JobBase(BaseSchema):
    """Base job fields shared across all job models."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Job title",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=50000,
        description="Full job description",
    )
    department: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Department name",
    )
    team: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Team name",
    )
    job_type: JobType = Field(
        default=JobType.FULL_TIME,
        description="Type of employment",
    )
    experience_level: ExperienceLevel = Field(
        default=ExperienceLevel.MID,
        description="Required experience level",
    )
    location: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Job location",
    )
    is_remote: bool = Field(
        default=False,
        description="Whether the job allows remote work",
    )
    required_skills: Optional[List[str]] = Field(
        default=None,
        description="List of required skills",
    )
    preferred_skills: Optional[List[str]] = Field(
        default=None,
        description="List of preferred/nice-to-have skills",
    )
    min_years_experience: Optional[int] = Field(
        default=None,
        ge=0,
        le=30,
        description="Minimum years of experience required",
    )
    education_requirement: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Education requirement",
    )
    salary_min: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Minimum salary",
    )
    salary_max: Optional[Decimal] = Field(
        default=None,
        ge=0,
        description="Maximum salary",
    )
    salary_currency: str = Field(
        default="USD",
        max_length=3,
        description="Salary currency code (ISO 4217)",
    )
    benefits: Optional[List[str]] = Field(
        default=None,
        description="List of benefits",
    )
    responsibilities: Optional[List[str]] = Field(
        default=None,
        description="List of job responsibilities",
    )

    @field_validator("required_skills", "preferred_skills", mode="before")
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

    @field_validator("salary_currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        """Validate and uppercase currency code."""
        return v.upper()

    @model_validator(mode="after")
    def validate_salary_range(self) -> "JobBase":
        """Validate that salary_min <= salary_max."""
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("salary_min cannot be greater than salary_max")
        return self


class JobCreate(JobBase):
    """Schema for creating a new job."""

    status: JobStatus = Field(
        default=JobStatus.DRAFT,
        description="Initial status of the job",
    )


class JobUpdate(BaseSchema):
    """Schema for updating a job. All fields are optional."""

    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=10, max_length=50000)
    department: Optional[str] = Field(default=None, max_length=100)
    team: Optional[str] = Field(default=None, max_length=100)
    job_type: Optional[JobType] = Field(default=None)
    experience_level: Optional[ExperienceLevel] = Field(default=None)
    location: Optional[str] = Field(default=None, max_length=200)
    is_remote: Optional[bool] = Field(default=None)
    required_skills: Optional[List[str]] = Field(default=None)
    preferred_skills: Optional[List[str]] = Field(default=None)
    min_years_experience: Optional[int] = Field(default=None, ge=0, le=30)
    education_requirement: Optional[str] = Field(default=None, max_length=200)
    salary_min: Optional[Decimal] = Field(default=None, ge=0)
    salary_max: Optional[Decimal] = Field(default=None, ge=0)
    salary_currency: Optional[str] = Field(default=None, max_length=3)
    benefits: Optional[List[str]] = Field(default=None)
    responsibilities: Optional[List[str]] = Field(default=None)
    status: Optional[JobStatus] = Field(default=None)


class JobResponse(JobBase, IDSchema, TimestampSchema):
    """Schema for job response."""

    status: JobStatus = Field(..., description="Current job status")
    posted_at: Optional[datetime] = Field(
        default=None,
        description="When the job was posted",
    )
    closes_at: Optional[datetime] = Field(
        default=None,
        description="When the job posting closes",
    )


class JobInDB(JobResponse, EmbeddingMixin):
    """Schema for job stored in database with vector embedding."""

    pass


class JobList(BaseSchema):
    """Schema for paginated list of jobs."""

    items: List[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., ge=0, description="Total number of jobs")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")