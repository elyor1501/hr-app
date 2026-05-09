# Application entry point for AI/ML microservice

import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from core.config import settings
from core.logging import configure_logging, RequestContextMiddleware
from api.router import api_router


# Initialize structured logging before anything else
configure_logging()

# Load full ESCO skills vocabulary if CSV is available.
# CSV is downloaded at Docker build time; path can be overridden via ESCO_CSV_PATH.
_esco_csv = os.getenv("ESCO_CSV_PATH", "/app/data/skills_en.csv")
try:
    from services.parsers.esco_matcher import load_esco_csv
    load_esco_csv(_esco_csv)
except Exception:
    pass  # built-in 400-skill vocabulary remains active

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