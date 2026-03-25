from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from pydantic import ValidationError
import pytest

from src.models import (
    CandidateCreate,
    CandidateInDB,
    CandidateResponse,
    CandidateStatus,
    CandidateUpdate,
    ExperienceLevel,
    JobCreate,
    JobInDB,
    JobResponse,
    JobStatus,
    JobType,
    JobUpdate,
)


class TestCandidateModels:
    """Tests for Candidate Pydantic models."""

    def test_candidate_create_valid(self) -> None:
        """Test creating a valid candidate."""
        candidate = CandidateCreate(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone="+1234567890",
            current_title="Software Engineer",
            years_of_experience=5,
            skills=["Python", "FastAPI"],
        )

        assert candidate.first_name == "John"
        assert candidate.last_name == "Doe"
        assert candidate.email == "john.doe@example.com"
        assert candidate.phone == "+1234567890"
        assert candidate.status == CandidateStatus.NEW

    def test_candidate_create_minimal(self) -> None:
        """Test creating candidate with only required fields."""
        candidate = CandidateCreate(
            first_name="Jane",
            last_name="Smith",
            email="jane.smith@example.com",
        )

        assert candidate.first_name == "Jane"
        assert candidate.phone is None
        assert candidate.skills is None

    def test_candidate_email_validation(self) -> None:
        """Test email validation."""
        with pytest.raises(ValidationError) as exc_info:
            CandidateCreate(
                first_name="John",
                last_name="Doe",
                email="invalid-email",
            )

        assert "email" in str(exc_info.value).lower()

    def test_candidate_phone_validation_valid(self) -> None:
        """Test valid phone number formats."""
        valid_phones = [
            "+1234567890",
            "1234567890",
            "+11234567890",
        ]

        for phone in valid_phones:
            candidate = CandidateCreate(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                phone=phone,
            )
            assert candidate.phone is not None

    def test_candidate_phone_validation_invalid(self) -> None:
        """Test invalid phone number."""
        with pytest.raises(ValidationError) as exc_info:
            CandidateCreate(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                phone="123",
            )

        assert "phone" in str(exc_info.value).lower()

    def test_candidate_skills_normalization(self) -> None:
        """Test skills are normalized to lowercase and deduplicated."""
        candidate = CandidateCreate(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            skills=["Python", "PYTHON", "  fastapi  ", "Python"],
        )

        assert candidate.skills == ["python", "fastapi"]

    def test_candidate_name_capitalization(self) -> None:
        """Test names are properly capitalized."""
        candidate = CandidateCreate(
            first_name="john",
            last_name="DOE",
            email="john@example.com",
        )

        assert candidate.first_name == "John"
        assert candidate.last_name == "Doe"

    def test_candidate_linkedin_validation_valid(self) -> None:
        """Test valid LinkedIn URL."""
        candidate = CandidateCreate(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            linkedin_url="https://linkedin.com/in/johndoe",
        )

        assert candidate.linkedin_url == "https://linkedin.com/in/johndoe"

    def test_candidate_linkedin_validation_invalid(self) -> None:
        """Test invalid LinkedIn URL."""
        with pytest.raises(ValidationError) as exc_info:
            CandidateCreate(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                linkedin_url="https://twitter.com/johndoe",
            )

        assert "linkedin" in str(exc_info.value).lower()

    def test_candidate_years_experience_range(self) -> None:
        """Test years of experience validation."""
        candidate = CandidateCreate(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            years_of_experience=25,
        )
        assert candidate.years_of_experience == 25

        with pytest.raises(ValidationError):
            CandidateCreate(
                first_name="John",
                last_name="Doe",
                email="john@example.com",
                years_of_experience=100,
            )

    def test_candidate_response_model(self) -> None:
        """Test CandidateResponse model with all fields."""
        now = datetime.utcnow()
        candidate = CandidateResponse(
            id=uuid4(),
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            status=CandidateStatus.INTERVIEW,
            created_at=now,
            updated_at=now,
        )

        assert candidate.status == CandidateStatus.INTERVIEW
        assert candidate.id is not None

    def test_candidate_indb_with_embedding(self) -> None:
        """Test CandidateInDB model with vector embedding."""
        now = datetime.utcnow()
        embedding = [0.1, 0.2, 0.3, 0.4, 0.5]

        candidate = CandidateInDB(
            id=uuid4(),
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            status=CandidateStatus.NEW,
            created_at=now,
            updated_at=now,
            embedding=embedding,
        )

        assert candidate.embedding == embedding
        assert len(candidate.embedding) == 5

    def test_candidate_update_partial(self) -> None:
        """Test partial update model."""
        update = CandidateUpdate(status=CandidateStatus.HIRED)

        assert update.status == CandidateStatus.HIRED
        assert update.first_name is None
        assert update.email is None

    def test_candidate_serialization(self) -> None:
        """Test model serializes to dict/JSON correctly."""
        candidate = CandidateCreate(
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            skills=["python"],
        )

        data = candidate.model_dump()
        assert data["first_name"] == "John"
        assert data["skills"] == ["python"]

        json_str = candidate.model_dump_json()
        assert "John" in json_str


class TestJobModels:
    """Tests for Job Pydantic models."""

    def test_job_create_valid(self) -> None:
        """Test creating a valid job."""
        job = JobCreate(
            title="Senior Software Engineer",
            description="We are looking for a talented engineer to join our team.",
            department="Engineering",
            job_type=JobType.FULL_TIME,
            experience_level=ExperienceLevel.SENIOR,
            required_skills=["Python", "FastAPI"],
            salary_min=Decimal("100000"),
            salary_max=Decimal("150000"),
        )

        assert job.title == "Senior Software Engineer"
        assert job.job_type == JobType.FULL_TIME
        assert job.status == JobStatus.DRAFT

    def test_job_create_minimal(self) -> None:
        """Test creating job with only required fields."""
        job = JobCreate(
            title="Backend Developer",
            description="Join our backend team to build amazing APIs.",
        )

        assert job.title == "Backend Developer"
        assert job.job_type == JobType.FULL_TIME
        assert job.is_remote is False

    def test_job_salary_range_validation(self) -> None:
        """Test salary range validation (min <= max)."""
        with pytest.raises(ValidationError) as exc_info:
            JobCreate(
                title="Developer",
                description="Join our team to build great things.",
                salary_min=Decimal("150000"),
                salary_max=Decimal("100000"),
            )

        assert "salary" in str(exc_info.value).lower()

    def test_job_skills_normalization(self) -> None:
        """Test skills are normalized."""
        job = JobCreate(
            title="Developer",
            description="Join our team to build great things.",
            required_skills=["PYTHON", "Python", "  FastAPI  "],
        )

        assert job.required_skills == ["python", "fastapi"]

    def test_job_currency_uppercase(self) -> None:
        """Test currency code is uppercased."""
        job = JobCreate(
            title="Developer",
            description="Join our team to build great things.",
            salary_currency="eur",
        )

        assert job.salary_currency == "EUR"

    def test_job_description_min_length(self) -> None:
        """Test description minimum length validation."""
        with pytest.raises(ValidationError):
            JobCreate(
                title="Developer",
                description="Short",
            )

    def test_job_response_model(self) -> None:
        """Test JobResponse model."""
        now = datetime.utcnow()
        job = JobResponse(
            id=uuid4(),
            title="Developer",
            description="Join our team to build great products.",
            job_type=JobType.FULL_TIME,
            experience_level=ExperienceLevel.MID,
            status=JobStatus.OPEN,
            is_remote=True,
            salary_currency="USD",
            created_at=now,
            updated_at=now,
        )

        assert job.status == JobStatus.OPEN
        assert job.is_remote is True

    def test_job_indb_with_embedding(self) -> None:
        """Test JobInDB model with vector embedding."""
        now = datetime.utcnow()
        embedding = [0.1] * 768

        job = JobInDB(
            id=uuid4(),
            title="Developer",
            description="Join our team to build great products.",
            job_type=JobType.FULL_TIME,
            experience_level=ExperienceLevel.MID,
            status=JobStatus.OPEN,
            is_remote=False,
            salary_currency="USD",
            created_at=now,
            updated_at=now,
            embedding=embedding,
        )

        assert len(job.embedding) == 768

    def test_job_update_partial(self) -> None:
        """Test partial update model."""
        update = JobUpdate(status=JobStatus.CLOSED, is_remote=True)

        assert update.status == JobStatus.CLOSED
        assert update.is_remote is True
        assert update.title is None

    def test_job_serialization(self) -> None:
        """Test model serializes correctly."""
        job = JobCreate(
            title="Developer",
            description="Join our team to build great products.",
            salary_min=Decimal("100000"),
        )

        data = job.model_dump()
        assert data["title"] == "Developer"
        assert data["salary_min"] == Decimal("100000")


class TestEnums:
    """Tests for enum values."""

    def test_candidate_status_values(self) -> None:
        """Test all CandidateStatus values exist."""
        assert CandidateStatus.NEW == "new"
        assert CandidateStatus.HIRED == "hired"
        assert CandidateStatus.REJECTED == "rejected"

    def test_job_status_values(self) -> None:
        """Test all JobStatus values exist."""
        assert JobStatus.DRAFT == "draft"
        assert JobStatus.OPEN == "open"
        assert JobStatus.CLOSED == "closed"

    def test_job_type_values(self) -> None:
        """Test all JobType values exist."""
        assert JobType.FULL_TIME == "full_time"
        assert JobType.PART_TIME == "part_time"
        assert JobType.CONTRACT == "contract"

    def test_experience_level_values(self) -> None:
        """Test all ExperienceLevel values exist."""
        assert ExperienceLevel.ENTRY == "entry"
        assert ExperienceLevel.SENIOR == "senior"
        assert ExperienceLevel.EXECUTIVE == "executive"


class TestVectorEmbedding:
    """Tests for vector embedding support."""

    def test_embedding_field_accepts_list_float(self) -> None:
        """Test embedding field accepts list of floats."""
        now = datetime.utcnow()
        embedding = [0.1, 0.2, 0.3]

        candidate = CandidateInDB(
            id=uuid4(),
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            status=CandidateStatus.NEW,
            created_at=now,
            updated_at=now,
            embedding=embedding,
        )

        assert isinstance(candidate.embedding, list)
        assert all(isinstance(x, float) for x in candidate.embedding)

    def test_embedding_field_optional(self) -> None:
        """Test embedding field is optional."""
        now = datetime.utcnow()

        candidate = CandidateInDB(
            id=uuid4(),
            first_name="John",
            last_name="Doe",
            email="john@example.com",
            status=CandidateStatus.NEW,
            created_at=now,
            updated_at=now,
        )

        assert candidate.embedding is None