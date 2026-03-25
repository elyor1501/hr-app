import pytest
import httpx
from aiobreaker import CircuitBreakerError, CircuitBreakerState
from src.services.ai_client import AIClient, ai_breaker


@pytest.fixture(autouse=True)
def reset_breaker():
    """Reset circuit breaker state before each test."""
    ai_breaker.state = CircuitBreakerState.CLOSED
    yield


@pytest.mark.asyncio
async def test_ai_client_get_embeddings_success(respx_mock):
    """Test successful embedding retrieval."""
    client = AIClient()
    respx_mock.post("http://ai-service:8080/embeddings").mock(
        return_value=httpx.Response(200, json={"embedding": [0.1, 0.2]})
    )
    
    result = await client.get_embeddings("test text")
    assert result == [0.1, 0.2]


@pytest.mark.asyncio
async def test_ai_client_retry_logic(respx_mock):
    """Test that client retries on transient failures."""
    client = AIClient()
    route = respx_mock.post("http://ai-service:8080/embeddings")
    route.side_effect = [
        httpx.ConnectError("Fail 1"),
        httpx.ConnectError("Fail 2"),
        httpx.Response(200, json={"embedding": [0.9]})
    ]
    
    result = await client.get_embeddings("test")
    assert result == [0.9]
    assert route.call_count == 3


@pytest.mark.asyncio
async def test_ai_client_circuit_breaker_opens(respx_mock):
    """Test that circuit breaker opens after consecutive failures."""
    client = AIClient()
    respx_mock.post("http://ai-service:8080/embeddings").mock(
        return_value=httpx.Response(500)
    )
    
    for i in range(6):
        try:
            await client.get_embeddings("fail")
        except Exception:
            pass
    state_class_name = ai_breaker._state.__class__.__name__
    assert state_class_name == "CircuitOpenState", f"Expected CircuitOpenState, got {state_class_name}"
    
    with pytest.raises(CircuitBreakerError):
        await client.get_embeddings("blocked")