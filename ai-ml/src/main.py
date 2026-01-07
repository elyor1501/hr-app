# Application entry point for AI/ML microservice

from fastapi import FastAPI

from src.core.config import settings
from src.core.logging import configure_logging, RequestContextMiddleware
# from core.security import RateLimitMiddleware
from src.api.router import api_router


# Initialize structured logging before anything else
configure_logging()

# Create FastAPI application
app = FastAPI(
    title="AI/ML Service",
    description="Internal AI/ML microservice for HR application",
    version="0.1.0",
)

# Attach middleware
app.add_middleware(RequestContextMiddleware)
 # app.add_middleware(RateLimitMiddleware)

# Register API routes
app.include_router(api_router)