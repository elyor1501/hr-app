# D:\hr-app\services\backend\tests\test_api_crud.py

import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_create_and_read_job(client: AsyncClient):
    """Test full CRUD cycle for Job."""
    
    # 1. Create
    job_data = {
        "title": "Test Job",
        "description": "This is a test job description that is long enough.",
        "job_type": "full_time",
        "experience_level": "mid",
        "salary_min": 100000,
        "salary_max": 120000,
        "salary_currency": "USD"
    }
    
    response = await client.post("/api/v1/jobs/", json=job_data)
    assert response.status_code == 201
    created_job = response.json()
    job_id = created_job["id"]
    assert created_job["title"] == job_data["title"]
    
    # 2. Read One
    response = await client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 200
    assert response.json()["id"] == job_id
    
    # 3. Read All
    response = await client.get("/api/v1/jobs/")
    assert response.status_code == 200
    assert len(response.json()) >= 1
    
    # 4. Update
    update_data = {"title": "Updated Job Title"}
    response = await client.patch(f"/api/v1/jobs/{job_id}", json=update_data)
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Job Title"
    
    # 5. Delete
    response = await client.delete(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 204
    
    # 6. Verify Deleted (Should be 404)
    response = await client.get(f"/api/v1/jobs/{job_id}")
    assert response.status_code == 404

@pytest.mark.asyncio
async def test_create_candidate_simple(client: AsyncClient):
    """Test creating candidate (no file for simplicity in integration test)."""
    
    # Use Form data format
    data = {
        "first_name": "Test",
        "last_name": "Candidate",
        "email": "test.candidate@example.com",
        "phone": "+1234567890"
    }
    
    response = await client.post("/api/v1/candidates/", data=data)
    assert response.status_code == 201
    created = response.json()
    assert created["email"] == data["email"]
    
    # Clean up (Delete)
    c_id = created["id"]
    await client.delete(f"/api/v1/candidates/{c_id}")