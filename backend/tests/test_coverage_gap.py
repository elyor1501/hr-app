import pytest
from httpx import AsyncClient
from uuid import uuid4
from src.repositories.base import BaseRepository
from src.db.models import Job
from src.services.files import FileService
from fastapi import UploadFile
import os

# ==========================================
# 1. Main.py & Config Coverage
# ==========================================
@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test the root / endpoint to hit main.py lines."""
    response = await client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "FastAPI backend is running"}

# ==========================================
# 2. Candidate Error Handling (Hits missing lines in candidates.py)
# ==========================================
@pytest.mark.asyncio
async def test_candidate_invalid_email_format(client: AsyncClient):
    """
    Passes FastAPI 'Form' validation (field exists) 
    but fails inner 'CandidateCreate' Pydantic validation.
    This forces the code to enter the 'except ValidationError' block.
    """
    data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": "not-an-email-address", # Invalid format
        "status": "new"
    }
    # This hits lines 56-66 in candidates.py
    response = await client.post("/api/v1/candidates/", data=data)
    assert response.status_code == 422
    # Ensure it's our manual error, not FastAPI's default
    assert "value is not a valid email address" in str(response.content)

@pytest.mark.asyncio
async def test_candidate_duplicate_email(client: AsyncClient):
    """Test creating a candidate with existing email (400 Bad Request)."""
    email = f"dup.{uuid4()}@example.com"
    data = {
        "first_name": "Test", "last_name": "User", 
        "email": email, "status": "new"
    }

    # Create first time (201)
    await client.post("/api/v1/candidates/", data=data)

    # Create second time (400) - Hits lines 48-53
    res2 = await client.post("/api/v1/candidates/", data=data)
    assert res2.status_code == 400
    assert "Candidate with this email already exists" in res2.json()["detail"]

# ==========================================
# 3. Job Error Handling (Hits missing lines in jobs.py)
# ==========================================
@pytest.mark.asyncio
async def test_job_not_found_edge_cases(client: AsyncClient):
    """Test 404s for Update and Delete to hit missing lines."""
    fake_id = str(uuid4())
    
    # Update non-existent (Hits lines 62-65)
    res = await client.patch(f"/api/v1/jobs/{fake_id}", json={"title": "Ghost"})
    assert res.status_code == 404
    
    # Delete non-existent (Hits lines 74-75)
    res = await client.delete(f"/api/v1/jobs/{fake_id}")
    assert res.status_code == 404

# ==========================================
# 4. Repository Base Coverage (Hits base.py)
# ==========================================
@pytest.mark.asyncio
async def test_repository_base_methods(db_session):
    """
    Directly test BaseRepository to cover helper methods 
    that might be skipped by high-level API tests.
    """
    repo = BaseRepository(Job, db_session)
    
    # Create via Repo
    job_data = {
        "title": "Repo Test", 
        "description": "Desc", 
        "status": "OPEN", 
        "salary_currency": "USD"
    }
    result = await repo.create(**job_data)
    assert result.id is not None
    
    # Test 'exists' helper (Hits lines checking existence)
    assert await repo.exists(result.id) is True
    assert await repo.exists(uuid4()) is False
    
    # Test 'delete' helper return values
    assert await repo.delete(result.id) is True
    assert await repo.delete(result.id) is False # Second delete returns False

# ==========================================
# 5. File Service Logic (Hits files.py)
# ==========================================
@pytest.mark.asyncio
async def test_file_service_logic(tmp_path):
    """Test saving a file without mocking to hit files.py logic."""
    service = FileService()
    
    # FIX: Create the directory before using it!
    test_dir = tmp_path / "uploads"
    test_dir.mkdir()
    
    service.UPLOAD_DIR = test_dir

    filename = "real_test.pdf"
    file_content = b"Real content"
    
    # Create dummy input
    temp_input = tmp_path / "input.pdf"
    temp_input.write_bytes(file_content)

    with open(temp_input, "rb") as f:
        upload_file = UploadFile(file=f, filename=filename)
        saved_path = await service.save_cv(upload_file)
        
        # Verify
        assert "pdf" in saved_path
        # Verify file exists on disk
        assert (test_dir / os.path.basename(saved_path)).exists()