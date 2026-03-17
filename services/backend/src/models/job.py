from __future__ import annotations
from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional, Union
from pydantic import Field, field_validator, model_validator
from src.models.base import BaseSchema, EmbeddingMixin, IDSchema, TimestampSchema
from src.models.enums import ExperienceLevel, JobStatus, JobType


# ── Map experience-level names → approximate years ──
EXPERIENCE_LEVEL_YEARS = {
    "intern": 0,
    "entry": 0,
    "entry_level": 0,
    "junior": 1,
    "mid": 3,
    "middle": 3,
    "senior": 5,
    "lead": 8,
    "principal": 10,
    "executive": 15,
}


class JobBase(BaseSchema):
    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=10, max_length=50000)
    department: Optional[str] = Field(default=None, max_length=100)
    team: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)
    salary_min: Optional[Decimal] = Field(default=None, ge=0)
    salary_max: Optional[Decimal] = Field(default=None, ge=0)
    salary_currency: str = Field(default="USD", max_length=3)
    salary_range: Optional[str] = Field(default=None, max_length=100)
    hiring_manager: Optional[str] = Field(default=None, max_length=100)
    openings: Optional[int] = Field(default=1)
    required_skills: Optional[List[str]] = Field(default=None)
    preferred_skills: Optional[List[str]] = Field(default=None)
    benefits: Optional[List[str]] = Field(default=None)
    responsibilities: Optional[Union[str, List[str]]] = Field(default=None)

    # ── Alias fields (frontend-friendly names) ──
    job_type: Optional[Union[JobType, str]] = Field(default=None)
    experience_level: Optional[Union[ExperienceLevel, str]] = Field(default=None)
    is_remote: Optional[bool] = Field(default=None)
    min_years_experience: Optional[int] = Field(default=None, ge=0, le=30)
    education_requirement: Optional[str] = Field(default=None, max_length=200)
    posted_at: Optional[datetime] = Field(default=None)
    closes_at: Optional[datetime] = Field(default=None)

    # ── DB column name fields (take priority) ──
    employment_type: Optional[str] = Field(default=None)
    work_mode: Optional[str] = Field(default=None)
    experience_required: Optional[Union[int, str]] = Field(default=None)
    education: Optional[Union[List[str], str]] = Field(default=None)
    application_posted: Optional[date] = Field(default=None)
    application_deadline: Optional[date] = Field(default=None)

    # ────────────────── validators ──────────────────

    @field_validator("required_skills", "preferred_skills", mode="before")
    @classmethod
    def normalize_skills(cls, v: Optional[List[str]]) -> Optional[List[str]]:
        if v is None:
            return None
        if isinstance(v, str):
            v = [s.strip() for s in v.split(",") if s.strip()]
        normalized = [skill.strip().lower() for skill in v if skill.strip()]
        seen = set()
        unique = []
        for skill in normalized:
            if skill not in seen:
                seen.add(skill)
                unique.append(skill)
        return unique if unique else None

    @field_validator("responsibilities", mode="before")
    @classmethod
    def normalize_responsibilities(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return "\n".join(str(item) for item in v if item)
        return str(v)

    @field_validator("benefits", mode="before")
    @classmethod
    def normalize_benefits(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [item.strip() for item in v.replace("\n", ",").split(",") if item.strip()]
        return v

    @field_validator("education", mode="before")
    @classmethod
    def normalize_education(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [e.strip() for e in v.split(",") if e.strip()]
        if isinstance(v, list):
            return [str(e).strip() for e in v if str(e).strip()]
        return v

    @field_validator("salary_currency")
    @classmethod
    def validate_currency(cls, v: str) -> str:
        return v.upper()

    @field_validator("job_type", mode="before")
    @classmethod
    def normalize_job_type(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.lower().replace(" ", "_").replace("-", "_")
            try:
                return JobType(v)
            except ValueError:
                return JobType.FULL_TIME
        return v

    @field_validator("experience_level", mode="before")
    @classmethod
    def normalize_experience_level(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.lower().replace(" ", "_").replace("-", "_")
            try:
                return ExperienceLevel(v)
            except ValueError:
                return ExperienceLevel.MID
        return v

    @model_validator(mode="after")
    def validate_salary_range(self) -> "JobBase":
        if self.salary_min is not None and self.salary_max is not None:
            if self.salary_min > self.salary_max:
                raise ValueError("salary_min cannot be greater than salary_max")
        return self

    # ────────────────── resolve helpers ──────────────────

    def _resolve_employment_type(self) -> Optional[str]:
        """DB field > job_type alias."""
        if self.employment_type is not None:
            return self.employment_type
        if self.job_type is not None:
            jt = self.job_type
            if isinstance(jt, JobType):
                jt = jt.value
            return jt
        return None

    def _resolve_work_mode(self) -> Optional[str]:
        """DB field > is_remote alias."""
        if self.work_mode is not None:
            return self.work_mode
        if self.is_remote is True:
            return "Remote"
        if self.is_remote is False:
            return "Onsite"
        return None

    def _resolve_experience(self) -> Optional[int]:
        """DB field (int or level-name string) > min_years_experience alias."""
        if self.experience_required is not None:
            if isinstance(self.experience_required, int):
                return self.experience_required
            if isinstance(self.experience_required, str):
                try:
                    return int(self.experience_required)
                except ValueError:
                    key = (
                        self.experience_required.lower()
                        .strip()
                        .replace("-", "_")
                        .replace(" ", "_")
                    )
                    return EXPERIENCE_LEVEL_YEARS.get(key)
        if self.min_years_experience is not None:
            return self.min_years_experience
        return None

    def _resolve_education(self) -> Optional[List[str]]:
        """DB field > education_requirement alias."""
        if self.education is not None:
            if isinstance(self.education, str):
                return [e.strip() for e in self.education.split(",") if e.strip()]
            return self.education
        if self.education_requirement:
            return [
                e.strip()
                for e in self.education_requirement.split(",")
                if e.strip()
            ]
        return None

    def _resolve_application_posted(self) -> Optional[date]:
        """DB field > posted_at alias."""
        if self.application_posted is not None:
            return self.application_posted
        if self.posted_at is not None:
            return (
                self.posted_at.date()
                if isinstance(self.posted_at, datetime)
                else self.posted_at
            )
        return None

    def _resolve_application_deadline(self) -> Optional[date]:
        """DB field > closes_at alias."""
        if self.application_deadline is not None:
            return self.application_deadline
        if self.closes_at is not None:
            return (
                self.closes_at.date()
                if isinstance(self.closes_at, datetime)
                else self.closes_at
            )
        return None

    # ────────────────── to_db_dict ──────────────────

    def to_db_dict(self) -> dict:
        data = {}
        data["title"] = self.title
        data["description"] = self.description
        data["department"] = self.department
        data["location"] = self.location
        data["required_skills"] = self.required_skills
        data["preferred_skills"] = self.preferred_skills
        data["salary_range"] = self.salary_range
        data["hiring_manager"] = self.hiring_manager
        data["openings"] = self.openings

        # employment_type
        resolved = self._resolve_employment_type()
        if resolved is not None:
            data["employment_type"] = resolved

        # work_mode
        resolved = self._resolve_work_mode()
        if resolved is not None:
            data["work_mode"] = resolved

        # experience_required
        resolved = self._resolve_experience()
        if resolved is not None:
            data["experience_required"] = resolved

        # education
        resolved = self._resolve_education()
        if resolved is not None:
            data["education"] = resolved

        # responsibilities (already normalized to str by validator)
        data["responsibilities"] = self.responsibilities

        # application_posted
        resolved = self._resolve_application_posted()
        if resolved is not None:
            data["application_posted"] = resolved

        # application_deadline
        resolved = self._resolve_application_deadline()
        if resolved is not None:
            data["application_deadline"] = resolved

        return data


class JobCreate(JobBase):
    status: Optional[Union[JobStatus, str]] = Field(default=JobStatus.DRAFT)

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if v is None:
            return JobStatus.DRAFT
        if isinstance(v, str):
            v = v.lower().strip()
            try:
                return JobStatus(v)
            except ValueError:
                return JobStatus.OPEN
        return v

    def to_db_dict(self) -> dict:
        data = super().to_db_dict()
        s = self.status
        if isinstance(s, JobStatus):
            s = s.value
        data["status"] = s
        return data


class JobUpdate(BaseSchema):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, min_length=10, max_length=50000)
    department: Optional[str] = Field(default=None, max_length=100)
    team: Optional[str] = Field(default=None, max_length=100)
    location: Optional[str] = Field(default=None, max_length=200)
    salary_min: Optional[Decimal] = Field(default=None, ge=0)
    salary_max: Optional[Decimal] = Field(default=None, ge=0)
    salary_currency: Optional[str] = Field(default=None, max_length=3)
    salary_range: Optional[str] = Field(default=None, max_length=100)
    hiring_manager: Optional[str] = Field(default=None, max_length=100)
    openings: Optional[int] = Field(default=None)
    required_skills: Optional[List[str]] = Field(default=None)
    preferred_skills: Optional[List[str]] = Field(default=None)
    benefits: Optional[List[str]] = Field(default=None)
    responsibilities: Optional[Union[str, List[str]]] = Field(default=None)
    status: Optional[Union[JobStatus, str]] = Field(default=None)

    # Alias fields
    job_type: Optional[Union[JobType, str]] = Field(default=None)
    experience_level: Optional[Union[ExperienceLevel, str]] = Field(default=None)
    is_remote: Optional[bool] = Field(default=None)
    min_years_experience: Optional[int] = Field(default=None, ge=0, le=30)
    education_requirement: Optional[str] = Field(default=None, max_length=200)
    posted_at: Optional[datetime] = Field(default=None)
    closes_at: Optional[datetime] = Field(default=None)

    # DB column name fields
    employment_type: Optional[str] = Field(default=None)
    work_mode: Optional[str] = Field(default=None)
    experience_required: Optional[Union[int, str]] = Field(default=None)
    education: Optional[Union[List[str], str]] = Field(default=None)
    application_posted: Optional[date] = Field(default=None)
    application_deadline: Optional[date] = Field(default=None)

    @field_validator("responsibilities", mode="before")
    @classmethod
    def normalize_responsibilities(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return "\n".join(str(item) for item in v if item)
        return str(v)

    @field_validator("education", mode="before")
    @classmethod
    def normalize_education(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            return [e.strip() for e in v.split(",") if e.strip()]
        if isinstance(v, list):
            return [str(e).strip() for e in v if str(e).strip()]
        return v

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if v is None:
            return None
        if isinstance(v, str):
            v = v.lower().strip()
            try:
                return JobStatus(v)
            except ValueError:
                return v
        return v

    def to_db_dict(self) -> dict:
        data = {}

        if self.title is not None:
            data["title"] = self.title
        if self.description is not None:
            data["description"] = self.description
        if self.department is not None:
            data["department"] = self.department
        if self.location is not None:
            data["location"] = self.location
        if self.required_skills is not None:
            data["required_skills"] = self.required_skills
        if self.preferred_skills is not None:
            data["preferred_skills"] = self.preferred_skills
        if self.salary_range is not None:
            data["salary_range"] = self.salary_range
        if self.hiring_manager is not None:
            data["hiring_manager"] = self.hiring_manager
        if self.openings is not None:
            data["openings"] = self.openings

        # employment_type: DB field > alias
        if self.employment_type is not None:
            data["employment_type"] = self.employment_type
        elif self.job_type is not None:
            jt = self.job_type
            if isinstance(jt, JobType):
                jt = jt.value
            data["employment_type"] = jt

        # work_mode: DB field > alias
        if self.work_mode is not None:
            data["work_mode"] = self.work_mode
        elif self.is_remote is not None:
            data["work_mode"] = "Remote" if self.is_remote else "Onsite"

        # experience_required: DB field > alias
        if self.experience_required is not None:
            if isinstance(self.experience_required, int):
                data["experience_required"] = self.experience_required
            elif isinstance(self.experience_required, str):
                try:
                    data["experience_required"] = int(self.experience_required)
                except ValueError:
                    key = (
                        self.experience_required.lower()
                        .strip()
                        .replace("-", "_")
                        .replace(" ", "_")
                    )
                    mapped = EXPERIENCE_LEVEL_YEARS.get(key)
                    if mapped is not None:
                        data["experience_required"] = mapped
        elif self.min_years_experience is not None:
            data["experience_required"] = self.min_years_experience

        # education: DB field > alias
        if self.education is not None:
            if isinstance(self.education, str):
                data["education"] = [
                    e.strip() for e in self.education.split(",") if e.strip()
                ]
            else:
                data["education"] = self.education
        elif self.education_requirement is not None:
            data["education"] = [
                e.strip()
                for e in self.education_requirement.split(",")
                if e.strip()
            ]

        # responsibilities
        if self.responsibilities is not None:
            if isinstance(self.responsibilities, list):
                data["responsibilities"] = "\n".join(self.responsibilities)
            else:
                data["responsibilities"] = self.responsibilities

        # status
        if self.status is not None:
            s = self.status
            if isinstance(s, JobStatus):
                s = s.value
            data["status"] = s

        # application_posted: DB field > alias
        if self.application_posted is not None:
            data["application_posted"] = self.application_posted
        elif self.posted_at is not None:
            data["application_posted"] = (
                self.posted_at.date()
                if isinstance(self.posted_at, datetime)
                else self.posted_at
            )

        # application_deadline: DB field > alias
        if self.application_deadline is not None:
            data["application_deadline"] = self.application_deadline
        elif self.closes_at is not None:
            data["application_deadline"] = (
                self.closes_at.date()
                if isinstance(self.closes_at, datetime)
                else self.closes_at
            )

        return data


class JobResponse(IDSchema, TimestampSchema):
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    location: Optional[str] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    experience_required: Optional[int] = None
    education: Optional[List[str]] = None
    salary_range: Optional[str] = None
    responsibilities: Optional[str] = None
    status: Optional[str] = None
    hiring_manager: Optional[str] = None
    openings: Optional[int] = None
    application_posted: Optional[date] = None
    application_deadline: Optional[date] = None

    @field_validator("status", mode="before")
    @classmethod
    def normalize_status(cls, v):
        if isinstance(v, str):
            return v.lower()
        if hasattr(v, "value"):
            return v.value
        return v

    class Config:
        from_attributes = True


class JobInDB(JobResponse, EmbeddingMixin):
    pass


class JobList(BaseSchema):
    items: List[JobResponse]
    total: int
    page: int
    size: int
    pages: int