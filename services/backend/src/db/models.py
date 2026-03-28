from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional, Any
from uuid import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from src.core.config import settings
from src.db.base import BaseModel
from src.models.enums import CandidateStatus, UserRole


class User(BaseModel):
    __tablename__ = "users"
    
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(Enum(UserRole, values_callable=lambda x: [e.value for e in x], name="userrole", create_type=False), default=UserRole.RECRUITER.value)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    
    __table_args__ = (
        Index('idx_users_email_active', 'email', 'is_active'),
    )


class Candidate(BaseModel):
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
    resume: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(Enum(CandidateStatus, values_callable=lambda x: [e.value for e in x], name="candidatestatus", create_type=False), default=CandidateStatus.ACTIVE.value, index=True)
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(3072), nullable=True)
    json_data: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    
    __table_args__ = (
        Index('idx_candidates_status', 'status'),
        Index('idx_candidates_created_at', 'created_at'),
    )


class Job(BaseModel):
    __tablename__ = "jobs"
    
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    employment_type: Mapped[Optional[str]] = mapped_column(String(50), index=True)
    work_mode: Mapped[Optional[str]] = mapped_column(String(50))
    location: Mapped[Optional[str]] = mapped_column(String(200))
    description: Mapped[Optional[str]] = mapped_column(Text)
    responsibilities: Mapped[Optional[str]] = mapped_column(Text)
    required_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    preferred_skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String), nullable=True)
    experience_required: Mapped[Optional[int]] = mapped_column(Integer)
    education: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    salary_range: Mapped[Optional[str]] = mapped_column(String(100))
    openings: Mapped[Optional[int]] = mapped_column(Integer, default=1)
    hiring_manager: Mapped[Optional[str]] = mapped_column(String(100))
    application_posted: Mapped[Optional[date]] = mapped_column(Date)
    application_deadline: Mapped[Optional[date]] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String(50), default="open", index=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(3072), nullable=True)
    
    __table_args__ = (
        Index('idx_jobs_status', 'status'),
        Index('idx_jobs_employment_type', 'employment_type'),
        Index('idx_jobs_created_at', 'created_at'),
        Index('idx_jobs_status_type', 'status', 'employment_type'),
    )


class MatchResult(BaseModel):
    __tablename__ = "match_results"
    
    candidate_id: Mapped[UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), index=True)
    job_id: Mapped[UUID] = mapped_column(ForeignKey("jobs.id", ondelete="CASCADE"), index=True)
    overall_score: Mapped[float] = mapped_column(Numeric(3, 2))
    skills_score: Mapped[float] = mapped_column(Numeric(3, 2))
    experience_score: Mapped[float] = mapped_column(Numeric(3, 2))
    reasoning: Mapped[Optional[str]] = mapped_column(Text)
    
    __table_args__ = (
        Index('idx_match_candidate_job', 'candidate_id', 'job_id'),
    )


class Resume(BaseModel):
    __tablename__ = "resumes"
    
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(3072), nullable=True)
    parsed_data: Mapped[Optional["ParsedResume"]] = relationship("ParsedResume", back_populates="resume", uselist=False, cascade="all, delete-orphan", lazy="noload")
    
    __table_args__ = (
        Index('idx_resumes_created_at', 'created_at'),
    )


class ParsedResume(BaseModel):
    __tablename__ = "parsed_resumes"
    
    resume_id: Mapped[UUID] = mapped_column(ForeignKey("resumes.id", ondelete="CASCADE"), nullable=False, index=True)
    first_name: Mapped[Optional[str]] = mapped_column(String(100))
    last_name: Mapped[Optional[str]] = mapped_column(String(100))
    email: Mapped[Optional[str]] = mapped_column(String(255), index=True)
    phone: Mapped[Optional[str]] = mapped_column(String(50))
    current_title: Mapped[Optional[str]] = mapped_column(String(200))
    current_company: Mapped[Optional[str]] = mapped_column(String(200))
    years_of_experience: Mapped[Optional[int]] = mapped_column(Integer)
    skills: Mapped[Optional[List[str]]] = mapped_column(ARRAY(String))
    location: Mapped[Optional[str]] = mapped_column(String(200))
    linkedin_url: Mapped[Optional[str]] = mapped_column(String(500))
    github: Mapped[Optional[str]] = mapped_column(String(500))
    portfolio: Mapped[Optional[str]] = mapped_column(String(500))
    summary: Mapped[Optional[str]] = mapped_column(Text)
    education: Mapped[Optional[list]] = mapped_column(JSONB)
    experience: Mapped[Optional[list]] = mapped_column(JSONB)
    projects: Mapped[Optional[list]] = mapped_column(JSONB)
    certifications: Mapped[Optional[list]] = mapped_column(JSONB)
    confidence_scores: Mapped[Optional[dict]] = mapped_column(JSONB)
    confidence_score: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    extraction_latency: Mapped[Optional[float]] = mapped_column(Numeric(10, 4))
    json_data: Mapped[Optional[dict]] = mapped_column(JSONB)
    candidate_status: Mapped[str] = mapped_column(String(20), nullable=False, default="active", server_default="active", index=True)
    
    resume: Mapped["Resume"] = relationship("Resume", back_populates="parsed_data", lazy="noload")
    
    __table_args__ = (
        Index('idx_parsed_resumes_status', 'candidate_status'),
        Index('idx_parsed_resumes_resume_id', 'resume_id'),
        Index('idx_parsed_resumes_created_at', 'created_at'),
    )