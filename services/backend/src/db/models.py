from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    ARRAY,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column

from src.core.config import settings
from src.db.base import BaseModel
from src.models.enums import (
    CandidateStatus,
    UserRole,
)


class User(BaseModel):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String(255), nullable=False
    )
    role: Mapped[str] = mapped_column(
        Enum(
            UserRole,
            values_callable=lambda x: [e.value for e in x],
            name="userrole",
            create_type=False,
        ),
        default=UserRole.RECRUITER.value,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True
    )


class Candidate(BaseModel):
    __tablename__ = "candidates"

    first_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    last_name: Mapped[str] = mapped_column(
        String(100), nullable=False
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True
    )
    current_title: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    current_company: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    years_of_experience: Mapped[Optional[int]] = mapped_column(
        Integer, nullable=True
    )
    skills: Mapped[Optional[List[str]]] = mapped_column(
        ARRAY(String), nullable=True
    )
    resume_text: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    # Resume is now TEXT because it stores the URL
    resume: Mapped[Optional[str]] = mapped_column(
        Text, nullable=True
    )
    location: Mapped[Optional[str]] = mapped_column(
        String(200), nullable=True
    )
    status: Mapped[str] = mapped_column(
        Enum(
            CandidateStatus,
            values_callable=lambda x: [e.value for e in x],
            name="candidatestatus",
            create_type=False,
        ),
        default=CandidateStatus.ACTIVE.value,
    )
    linkedin_url: Mapped[Optional[str]] = mapped_column(
        String(500), nullable=True
    )
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(settings.vector_dimension), nullable=True
    )


class Job(BaseModel):
    __tablename__ = "jobs"

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    employment_type: Mapped[Optional[str]] = mapped_column(String(50))
    work_mode: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(200))
    
    description: Mapped[Optional[str]] = mapped_column(Text)
    responsibilities: Mapped[Optional[str]] = mapped_column(Text)
    
    # Skills stored as text (comma separated) to match frontend
    required_skills: Mapped[Optional[str]] = mapped_column(Text)
    preferred_skills: Mapped[Optional[str]] = mapped_column(Text)
    
    experience_required: Mapped[Optional[int]] = mapped_column(Integer)
    
    # Education stored as Array of strings
    education: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    
    salary_range: Mapped[Optional[str]] = mapped_column(String(100))
    openings: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    hiring_manager: Mapped[Optional[str]] = mapped_column(String(100))
    
    application_posted: Mapped[Optional[date]] = mapped_column(Date)
    application_deadline: Mapped[Optional[date]] = mapped_column(Date)
    
    status: Mapped[str] = mapped_column(String(50), default="open")
    
    embedding: Mapped[Optional[List[float]]] = mapped_column(
        Vector(settings.vector_dimension), nullable=True
    )


class MatchResult(BaseModel):
    __tablename__ = "match_results"

    candidate_id: Mapped[UUID] = mapped_column(
        ForeignKey("candidates.id", ondelete="CASCADE")
    )
    job_id: Mapped[UUID] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE")
    )
    overall_score: Mapped[float] = mapped_column(
        Numeric(3, 2)
    )
    skills_score: Mapped[float] = mapped_column(
        Numeric(3, 2)
    )
    experience_score: Mapped[float] = mapped_column(
        Numeric(3, 2)
    )
    reasoning: Mapped[Optional[str]] = mapped_column(Text)