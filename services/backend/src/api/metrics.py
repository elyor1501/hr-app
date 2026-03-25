# src/api/metrics.py
"""
Prometheus metrics endpoint.
"""

from fastapi import APIRouter, Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    Counter,
    Gauge,
    Histogram,
    generate_latest,
)

router = APIRouter(tags=["metrics"])

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"],
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency",
    ["method", "endpoint"],
    buckets=[0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0],
)

# Cache metrics
CACHE_HITS = Counter("cache_hits_total", "Total cache hits", ["cache_type"])
CACHE_MISSES = Counter("cache_misses_total", "Total cache misses", ["cache_type"])

# Job metrics
JOBS_SUBMITTED = Counter("background_jobs_submitted_total", "Jobs submitted", ["job_type"])
JOBS_COMPLETED = Counter("background_jobs_completed_total", "Jobs completed", ["job_type", "status"])
JOBS_IN_PROGRESS = Gauge("background_jobs_in_progress", "Jobs in progress", ["job_type"])

# AI Service metrics
AI_SERVICE_REQUESTS = Counter("ai_service_requests_total", "AI requests", ["endpoint", "status"])

# Circuit breaker
CIRCUIT_BREAKER_STATE = Gauge("circuit_breaker_state", "Circuit breaker (0=closed, 1=open)", ["service"])


@router.get("/metrics", summary="Prometheus metrics")
async def metrics():
    """Expose metrics in Prometheus format."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)