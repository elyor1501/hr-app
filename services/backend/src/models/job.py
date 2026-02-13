from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import Field

from src.models.base import (
    BaseSchema,
    EmbeddingMixin,
    IDSchema,
    TimestampSchema,
)


class JobBase(BaseSchema):
    """Base job fields matching frontend form exactly."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Job title",
    )
    department: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Department name",
    )
    employment_type: Optional[str] = Field(
        default=None,
        description="Type of employment (full_time, etc)",
    )
    work_mode: Optional[str] = Field(
        default=None,
        description="Work mode (remote, hybrid, onsite)",
    )
    location: Optional[str] = Field(
        default=None,
        max_length=200,
        description="Job location",
    )
    
    description: Optional[str] = Field(
        default=None,
        description="Full job description",
    )
    responsibilities: Optional[str] = Field(
        default=None,
        description="List of job responsibilities",
    )
    
    required_skills: Optional[str] = Field(
        default=None,
        description="Comma separated required skills",
    )
    preferred_skills: Optional[str] = Field(
        default=None,
        description="Comma separated preferred skills",
    )
    
    experience_required: Optional[int] = Field(
        default=0,
        ge=0,
        description="Minimum years of experience required",
    )
    education: Optional[List[str]] = Field(
        default=[],
        description="List of education qualifications",
    )
    
    salary_range: Optional[str] = Field(
        default=None,
        description="Salary range string (e.g. 5LPA - 10LPA)",
    )
    openings: Optional[int] = Field(
        default=1,
        ge=1,
        description="Number of openings",
    )
    hiring_manager: Optional[str] = Field(
        default=None,
        description="Name of hiring manager",
    )
    
    application_posted: Optional[date] = Field(
        default=None,
        description="Date posted",
    )
    application_deadline: Optional[date] = Field(
        default=None,
        description="Deadline date",
    )
    
    status: Optional[str] = Field(
        default="open",
        description="Job status (draft, open, closed)",
    )


class JobCreate(JobBase):
    pass


class JobUpdate(JobBase):
    pass


class JobResponse(JobBase, IDSchema, TimestampSchema):
    pass


class JobInDB(JobResponse, EmbeddingMixin):
    pass


class JobList(BaseSchema):
    items: List[JobResponse] = Field(..., description="List of jobs")
    total: int = Field(..., ge=0, description="Total number of jobs")
    page: int = Field(..., ge=1, description="Current page number")
    size: int = Field(..., ge=1, le=100, description="Items per page")
    pages: int = Field(..., ge=0, description="Total number of pages")