import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi import HTTPException, UploadFile
from uuid import uuid4
from httpx import AsyncClient
from src.services.files import FileService
from src.repositories.base import BaseRepository
from src.repositories.candidate import CandidateRepository
from src.repositories.job import JobRepository
from src.db.models import Job, Candidate
from src.models.enums import JobStatus

# ==========================================
# 1. FILE SERVICE ERROR TESTS (100% Complete)
# ==========================================
@pytest.mark.asyncio
async def test_file_service_save_failure(tmp_path):
    """Force the FileService to fail while writing to disk."""
    service = FileService()
    service.UPLOAD_DIR = tmp_path

    filename = "crash_test.pdf"
    with open(tmp_path / "dummy", "w") as f:
        f.write("content")
    
    with open(tmp_path / "dummy", "rb") as f:
        upload_file = UploadFile(file=f, filename=filename)

        with patch("aiofiles.open", side_effect=OSError("Disk Full")):
            with pytest.raises(HTTPException) as exc:
                await service.save_cv(upload_file)
            
            assert exc.value.status_code == 500
            assert "Failed to save file" in exc.value.detail

@pytest.mark.asyncio
async def test_file_service_no_filename():
    """Test upload with empty filename."""
    service = FileService()
    upload_file = UploadFile(file=MagicMock(), filename="")
    
    with pytest.raises(HTTPException) as exc:
        await service.save_cv(upload_file)
    assert exc.value.status_code == 400

@pytest.mark.asyncio
async def test_file_service_bad_extension():
    """Test upload with .exe file."""
    service = FileService()
    upload_file = UploadFile(file=MagicMock(), filename="virus.exe")
    
    with pytest.raises(HTTPException) as exc:
        await service.save_cv(upload_file)
    assert exc.value.status_code == 400


# ==========================================
# 2. CANDIDATE API FULL COVERAGE
# ==========================================
@pytest.mark.asyncio
async def test_candidate_crud_full(client: AsyncClient):
    """
    Complete CRUD test for candidates to hit all router lines.
    """
    email = f"fulltest.{uuid4()}@example.com"
    
    # CREATE with all fields
    data = {
        "first_name": "Full",
        "last_name": "Test",
        "email": email,
        "phone": "+1234567890",
        "current_title": "Developer",
        "current_company": "TestCorp",
        "years_of_experience": "5",
        "linkedin_url": "https://linkedin.com/in/test"
    }
    res = await client.post("/api/v1/candidates/", data=data)
    assert res.status_code == 201
    candidate_id = res.json()["id"]
    
    # READ
    res = await client.get(f"/api/v1/candidates/{candidate_id}")
    assert res.status_code == 200
    
    # UPDATE (PATCH)
    res = await client.patch(
        f"/api/v1/candidates/{candidate_id}", 
        json={"first_name": "Updated", "status": "screening"}
    )
    assert res.status_code == 200
    assert res.json()["first_name"] == "Updated"
    
    # LIST
    res = await client.get("/api/v1/candidates/")
    assert res.status_code == 200
    assert len(res.json()) >= 1
    
    # DELETE
    res = await client.delete(f"/api/v1/candidates/{candidate_id}")
    assert res.status_code == 204
    
    # VERIFY 404 after delete
    res = await client.get(f"/api/v1/candidates/{candidate_id}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_candidate_not_found_cases(client: AsyncClient):
    """Test all 404 scenarios for candidates."""
    fake_id = str(uuid4())
    
    # GET non-existent
    res = await client.get(f"/api/v1/candidates/{fake_id}")
    assert res.status_code == 404
    
    # PATCH non-existent
    res = await client.patch(f"/api/v1/candidates/{fake_id}", json={"first_name": "Ghost"})
    assert res.status_code == 404
    
    # DELETE non-existent
    res = await client.delete(f"/api/v1/candidates/{fake_id}")
    assert res.status_code == 404


# ==========================================
# 3. JOB API FULL COVERAGE
# ==========================================
@pytest.mark.asyncio
async def test_job_crud_full(client: AsyncClient):
    """Complete CRUD test for jobs."""
    
    # CREATE
    job_data = {
        "title": "Full Coverage Job",
        "description": "Testing all the things for maximum coverage.",
        "department": "QA",
        "job_type": "full_time",
        "experience_level": "senior",
        "status": "open"
    }
    res = await client.post("/api/v1/jobs/", json=job_data)
    assert res.status_code == 201
    job_id = res.json()["id"]
    
    # READ
    res = await client.get(f"/api/v1/jobs/{job_id}")
    assert res.status_code == 200
    
    # UPDATE
    res = await client.patch(f"/api/v1/jobs/{job_id}", json={"title": "Updated Title"})
    assert res.status_code == 200
    
    # LIST with search
    res = await client.get("/api/v1/jobs/?search=Updated")
    assert res.status_code == 200
    
    # LIST with status filter
    res = await client.get("/api/v1/jobs/?status=open")
    assert res.status_code == 200
    
    # DELETE (soft)
    res = await client.delete(f"/api/v1/jobs/{job_id}")
    assert res.status_code == 204
    
    # VERIFY 404 after soft delete
    res = await client.get(f"/api/v1/jobs/{job_id}")
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_job_not_found_cases(client: AsyncClient):
    """Test all 404 scenarios for jobs."""
    fake_id = str(uuid4())
    
    # GET non-existent
    res = await client.get(f"/api/v1/jobs/{fake_id}")
    assert res.status_code == 404
    
    # PATCH non-existent
    res = await client.patch(f"/api/v1/jobs/{fake_id}", json={"title": "Ghost"})
    assert res.status_code == 404
    
    # DELETE non-existent
    res = await client.delete(f"/api/v1/jobs/{fake_id}")
    assert res.status_code == 404


# ==========================================
# 4. REPOSITORY DIRECT TESTS (Hits base.py)
# ==========================================
@pytest.mark.asyncio
async def test_job_repository_methods(db_session):
    """Test JobRepository methods directly."""
    repo = JobRepository(db_session)
    
    # Create
    job = await repo.create(
        title="Repo Direct Test",
        description="Testing repo directly",
        status=JobStatus.OPEN,
        salary_currency="USD"
    )
    assert job.id is not None
    
    # Get by ID
    fetched = await repo.get_by_id(job.id)
    assert fetched is not None
    assert fetched.title == "Repo Direct Test"
    
    # Get all with search
    jobs = await repo.get_all(search="Direct")
    assert len(jobs) >= 1
    
    # Get all with status filter
    jobs = await repo.get_all(status=JobStatus.OPEN)
    assert len(jobs) >= 1
    
    # Soft delete
    deleted = await repo.delete(job.id)
    assert deleted is True
    
    # Verify soft delete worked (get_by_id returns None)
    fetched = await repo.get_by_id(job.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_candidate_repository_methods(db_session):
    """Test CandidateRepository methods directly."""
    repo = CandidateRepository(db_session)
    
    email = f"repo.{uuid4()}@test.com"
    
    # Create
    candidate = await repo.create(
        first_name="Repo",
        last_name="Test",
        email=email,
        status="NEW"
    )
    assert candidate.id is not None
    
    # Get by email
    fetched = await repo.get_by_email(email)
    assert fetched is not None
    assert fetched.email == email
    
    # Get by email (non-existent)
    none_result = await repo.get_by_email("nonexistent@test.com")
    assert none_result is None
    
    # Cleanup
    await repo.delete(candidate.id)


@pytest.mark.asyncio
async def test_base_repository_exists_method(db_session):
    """Test the 'exists' helper in BaseRepository."""
    repo = BaseRepository(Job, db_session)
    
    # Create a job
    job = await repo.create(
        title="Exists Test",
        description="Testing exists method",
        status="OPEN",
        salary_currency="USD"
    )
    
    # Exists should return True
    assert await repo.exists(job.id) is True
    
    # Delete it
    await repo.delete(job.id)
    
    # Exists should return False after delete
    assert await repo.exists(job.id) is False
    
    # Random UUID should not exist
    assert await repo.exists(uuid4()) is False