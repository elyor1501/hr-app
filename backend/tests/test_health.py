from httpx import AsyncClient
import pytest


class TestHealthEndpoints:
    """Tests for health check endpoints."""

    @pytest.mark.asyncio
    async def test_health_endpoint_returns_healthy(
        self, client: AsyncClient
    ) -> None:
        """Test /health endpoint returns healthy status."""
        response = await client.get("/health")

        assert response.status_code == 200
        assert response.json() == {"status": "healthy"}

    @pytest.mark.asyncio
    async def test_ready_endpoint_returns_status(
        self, client: AsyncClient
    ) -> None:
        """Test /ready endpoint returns readiness status with checks."""
        response = await client.get("/ready")

        assert response.status_code in [200, 503]
        data = response.json()
        assert "status" in data
        assert "checks" in data
        assert "database" in data["checks"]

    @pytest.mark.asyncio
    async def test_root_endpoint(self, client: AsyncClient) -> None:
        """Test root endpoint returns welcome message."""
        response = await client.get("/")

        assert response.status_code == 200
        assert "message" in response.json()