# Application entry point for AI/ML microservice

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.logging import configure_logging, RequestContextMiddleware
from api.router import api_router


# Initialize structured logging before anything else
configure_logging()

# Create FastAPI application
app = FastAPI(
    title="AI/ML Service",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Attach middleware
app.add_middleware(RequestContextMiddleware)

# ---------------------------------------------------------
# LOCAL TEST FILE MOUNT (for PDF/DOCX testing only)
# ---------------------------------------------------------
# This exposes files inside /test_files via:
# http://localhost:8001/files/<filename>
# Example:
# http://localhost:8001/files/Xander_Rohit_Khandelwal_VP.pdf
# ---------------------------------------------------------

# app.mount(
#     "/files",
#     StaticFiles(directory="test_files"),
#     name="files",
# )

# Register API routes
app.include_router(api_router)