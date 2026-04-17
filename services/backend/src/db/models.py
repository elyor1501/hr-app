from __future__ import annotations
from datetime import date, datetime
from typing import List, Optional, Any
from uuid import UUID
from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, Date, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
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
        Index("idx_users_email_active", "email", "is_active"),
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
    experience_level: Mapped[Optional[str]] = mapped_column(String(50), nullable=True, index=True)
    hourly_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    availability: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    cvs: Mapped[List["CandidateCV"]] = relationship("CandidateCV", back_populates="candidate", cascade="all, delete-orphan", lazy="noload")
    attachments: Mapped[List["CandidateAttachment"]] = relationship("CandidateAttachment", back_populates="candidate", cascade="all, delete-orphan", lazy="noload")

    __table_args__ = (
        Index("idx_candidates_status", "status"),
        Index("idx_candidates_created_at", "created_at"),
        Index("idx_candidates_experience_level", "experience_level"),
        Index("idx_candidates_location", "location"),
        Index("idx_candidates_current_title", "current_title"),
        Index("idx_candidates_name", "first_name", "last_name"),
    )


class CandidateCV(BaseModel):
    __tablename__ = "candidate_cvs"

    candidate_id: Mapped[UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="cvs", lazy="noload")

    __table_args__ = (
        Index("idx_candidate_cvs_candidate_id", "candidate_id"),
        Index("idx_candidate_cvs_is_primary", "candidate_id", "is_primary"),
    )


class CandidateAttachment(BaseModel):
    __tablename__ = "candidate_attachments"

    candidate_id: Mapped[UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    attachment_type: Mapped[str] = mapped_column(String(50), nullable=False)
    file_size: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    candidate: Mapped["Candidate"] = relationship("Candidate", back_populates="attachments", lazy="noload")

    __table_args__ = (
        Index("idx_candidate_attachments_candidate_id", "candidate_id"),
        Index("idx_candidate_attachments_type", "attachment_type"),
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
        Index("idx_jobs_status", "status"),
        Index("idx_jobs_employment_type", "employment_type"),
        Index("idx_jobs_created_at", "created_at"),
        Index("idx_jobs_status_type", "status", "employment_type"),
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
        Index("idx_match_candidate_job", "candidate_id", "job_id"),
    )


class Resume(BaseModel):
    __tablename__ = "resumes"

    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_url: Mapped[str] = mapped_column(Text, nullable=False)
    file_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True, unique=True, index=True)
    raw_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(3072), nullable=True)
    parsed_data: Mapped[Optional["ParsedResume"]] = relationship("ParsedResume", back_populates="resume", uselist=False, cascade="all, delete-orphan", lazy="noload")

    __table_args__ = (
        Index("idx_resumes_created_at", "created_at"),
        Index("idx_resumes_file_hash", "file_hash"),
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
        Index("idx_parsed_resumes_status", "candidate_status"),
        Index("idx_parsed_resumes_resume_id", "resume_id"),
        Index("idx_parsed_resumes_created_at", "created_at"),
        Index("idx_parsed_resumes_name", "first_name", "last_name"),
        Index("idx_parsed_resumes_title", "current_title"),
        Index("idx_parsed_resumes_location", "location"),
    )


class StaffingRequest(BaseModel):
    __tablename__ = "staffing_requests"

    request_number: Mapped[str] = mapped_column(String(20), unique=True, nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    request_title: Mapped[str] = mapped_column(String(255), nullable=False)
    job_description: Mapped[str] = mapped_column(Text, nullable=False)
    prepared_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    final_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    request_date: Mapped[date] = mapped_column(Date, nullable=False)
    proposed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    customer_feedback: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    contract_status: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    state: Mapped[str] = mapped_column(String(20), default="open", nullable=False, index=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    proposed_candidates: Mapped[List["RequestCandidate"]] = relationship("RequestCandidate", back_populates="request", cascade="all, delete-orphan", lazy="noload")

    __table_args__ = (
        Index("idx_staffing_requests_state", "state"),
        Index("idx_staffing_requests_company", "company_name"),
        Index("idx_staffing_requests_created_at", "created_at"),
        Index("idx_staffing_requests_state_created", "state", "created_at"),
    )


class RequestCandidate(BaseModel):
    __tablename__ = "request_candidates"

    request_id: Mapped[UUID] = mapped_column(ForeignKey("staffing_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id: Mapped[UUID] = mapped_column(ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True)
    proposed_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    proposed_rate: Mapped[Optional[float]] = mapped_column(Numeric(10, 2), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    request: Mapped["StaffingRequest"] = relationship("StaffingRequest", back_populates="proposed_candidates", lazy="noload")
    candidate: Mapped["Candidate"] = relationship("Candidate", lazy="noload")

    __table_args__ = (
        UniqueConstraint("request_id", "candidate_id", name="uq_request_candidate"),
        Index("idx_request_candidates_request_id", "request_id"),
        Index("idx_request_candidates_candidate_id", "candidate_id"),
    )


class RequestAuditLog(BaseModel):
    __tablename__ = "request_audit_logs"

    request_id: Mapped[UUID] = mapped_column(ForeignKey("staffing_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    old_state: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    new_state: Mapped[str] = mapped_column(String(20), nullable=False)
    changed_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_request_audit_request_id", "request_id"),
        Index("idx_request_audit_created_at", "created_at"),
    )