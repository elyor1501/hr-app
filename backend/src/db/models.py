from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.config import settings
from src.db.base import BaseModel
from src.models.enums import CandidateStatus, ExperienceLevel, JobStatus, JobType


class Candidate(BaseModel):
    """Candidate database model."""

    __tablename__ = "candidates"

    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    
    current_title: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    current_company: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    resume_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resume_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    status: Mapped[CandidateStatus] = mapped_column(
        Enum(CandidateStatus, name="candidate_status", create_type=False),
        default=CandidateStatus.NEW,
        nullable=False
    )
    
    # Vector embedding (using the dimension from config)
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(settings.vector_dimension), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Candidate {self.email}>"


class Job(BaseModel):
    """Job database model."""

    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    department: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    team: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    
    job_type: Mapped[JobType] = mapped_column(
        Enum(JobType, name="job_type", create_type=False),
        default=JobType.FULL_TIME,
        nullable=False
    )
    experience_level: Mapped[ExperienceLevel] = mapped_column(
        Enum(ExperienceLevel, name="experience_level", create_type=False),
        default=ExperienceLevel.MID,
        nullable=False
    )
    
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_remote: Mapped[bool] = mapped_column(Boolean, default=False)
    
    required_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    preferred_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    min_years_experience: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    education_requirement: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    
    salary_min: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    salary_max: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    salary_currency: Mapped[str] = mapped_column(String(3), default="USD")
    
    benefits: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    responsibilities: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    
    status: Mapped[JobStatus] = mapped_column(
        Enum(JobStatus, name="job_status", create_type=False),
        default=JobStatus.DRAFT,
        nullable=False
    )
    
    # Dates
    posted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    closes_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    deleted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Vector embedding
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(settings.vector_dimension), nullable=True
    )

    def __repr__(self) -> str:
        return f"<Job {self.title}>"