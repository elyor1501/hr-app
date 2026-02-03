import pytest
from httpx import AsyncClient
from uuid import uuid4
from unittest.mock import AsyncMock, patch

# ==========================================
# 🟢 JOB ENDPOINT TESTS (Search, Pagination, Soft Delete)
# ==========================================

@pytest.mark.asyncio
async def test_job_lifecycle_complete(client: AsyncClient):
    """
    Test the full lifecycle of a job:
    1. Create
    2. Read (Get by ID)
    3. Update
    4. Search (List)
    5. Soft Delete
    6. Verify Deletion
    """
    
    # 1. CREATE
    job_payload = {
        "title": "Senior Python Developer",
        "description": "We are looking for a rockstar developer with 5+ years of experience.",
        "department": "Engineering",
        "job_type": "full_time",
        "experience_level": "senior",
        "location": "Remote",
        "is_remote": True,
        "salary_min": 100000,
        "salary_max": 150000,
        "required_skills": ["python", "fastapi", "postgresql"],
        "status": "open"
    }
    
    response = await client.post("/api/v1/jobs/", json=job_payload)
    assert response.status_code == 201
    created_job = response.json()
    job_id = created_job["id"]
    
    assert created_job["title"] == job_payload["title"]
    assert created_job["status"] == "open"
    assert "python" in created_job["required_skills"]

    # 2. READ (Get by ID)
    response = await client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["id"] == job_id

    # 3. UPDATE
    update_payload = {"title": "Lead Python Developer", "salary_max": 160000}
    response = await client.patch(f"/api/v1/jobs/{job_id}", json=update_payload)
    assert response.status_code == 200
    updated_job = response.json()
    assert updated_job["title"] == "Lead Python Developer"
    
    # FIX: Convert string response to float for comparison
    assert float(updated_job["salary_max"]) == 160000.0

    # 4. SEARCH (List with filter)
    # Search by keyword "Lead"
    response = await client.get("/api/v1/jobs/?search=Lead")
    assert response.status_code == 200
    items = response.json()
    assert len(items) >= 1
    assert items[0]["id"] == job_id

    # Search by keyword "Java" (Should return empty)
    response = await client.get("/api/v1/jobs/?search=Java")
    assert response.status_code == 200
    assert len(response.json()) == 0

    # 5. SOFT DELETE
    response = await client.delete(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 204

    # 6. VERIFY DELETION
    # Getting by ID should fail (404)
    response = await client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 404

    # Should not appear in list
    response = await client.get("/api/v1/jobs/")
    ids = [job["id"] for job in response.json()]
    assert job_id not in ids


@pytest.mark.asyncio
async def test_job_pagination(client: AsyncClient):
    """Test pagination for jobs endpoint."""
    # Create 3 jobs
    for i in range(3):
        payload = {
            "title": f"Job {i}",
            "description": "Description...",
            "status": "open"
        }
        await client.post("/api/v1/jobs/", json=payload)

    # Test Limit
    response = await client.get("/api/v1/jobs/?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data) <= 2


# ==========================================
# 🟢 CANDIDATE ENDPOINT TESTS (Form Data & File Upload)
# ==========================================

@pytest.mark.asyncio
async def test_candidate_lifecycle_form_data(client: AsyncClient):
    """
    Test candidate creation using FORM DATA (multipart/form-data).
    This matches the actual implementation in src/api/v1/candidates.py.
    """

    # 1. CREATE using Form Data
    candidate_data = {
        "first_name": "John",
        "last_name": "Doe",
        "email": f"john.doe.{uuid4()}@example.com",
        "phone": "+1234567890",
        "years_of_experience": "5",
        "skills": "Python",
        "status": "new"
    }

    # We mock the FileService to avoid actual file system usage
    with patch("src.services.files.FileService.save_cv", new_callable=AsyncMock) as mock_save:
        mock_save.return_value = "s3://bucket/resume.pdf"
        
        # Simulate file upload
        files = {
            "resume": ("resume.pdf", b"%PDF-1.5 fake content", "application/pdf")
        }

        response = await client.post(
            "/api/v1/candidates/", 
            data=candidate_data, 
            files=files
        )

    assert response.status_code == 201
    created_candidate = response.json()
    candidate_id = created_candidate["id"]

    assert created_candidate["first_name"] == "John"
    assert created_candidate["email"] == candidate_data["email"]
    # Check if resume_url was set by our mock
    assert created_candidate["resume_url"] == "s3://bucket/resume.pdf"

    # 2. READ
    response = await client.get(f"/api/v1/candidates/{candidate_id}")
    assert response.status_code == 200
    assert response.json()["id"] == candidate_id

    # 3. UPDATE (PATCH)
    update_payload = {"first_name": "Jonathan", "status": "screening"}
    response = await client.patch(f"/api/v1/candidates/{candidate_id}", json=update_payload)
    assert response.status_code == 200
    updated_candidate = response.json()
    assert updated_candidate["first_name"] == "Jonathan"
    assert updated_candidate["status"] == "screening"

    # 4. LIST
    response = await client.get("/api/v1/candidates/")
    assert response.status_code == 200
    items = response.json()
    ids = [c["id"] for c in items]
    assert candidate_id in ids

    # 5. DELETE
    response = await client.delete(f"/api/v1/candidates/{candidate_id}")
    assert response.status_code == 204

    # Verify Delete
    response = await client.get(f"/api/v1/candidates/{candidate_id}")
    assert response.status_code == 404