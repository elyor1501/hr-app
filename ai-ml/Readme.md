AI/ML Microservice

This is the AI/ML FastAPI microservice for the HR application.
It is a backend-facing, internal service responsible for AI/ML workloads such as inference, document processing, and future RAG pipelines.

The service is designed to be independent, extensible, and production-ready, and is called only by the backend service, not directly by the frontend.

Project Structure-
services/
└── ai-ml/
    ├── src/
    │   ├── main.py                  # FastAPI app bootstrap
    │
    │   ├── api/                     # Internal API layer
    │   │   ├── router.py            # API router aggregation
    │   │   └── v1/
    │   │       ├── health.py        # /health and /ready endpoints
    │   │       └── inference.py     # Internal inference endpoint
    │
    │   ├── core/                    # Cross-cutting infrastructure
    │   │   ├── config.py            # Environment config, API keys, timeouts
    │   │   ├── logging.py           # Structured logging + request tracing
    │   │   └── security.py          # Rate limiting placeholder
    │
    │   ├── services/                # AI/ML business logic (FINAL place)
    │   │   ├── extractors/           # Document extraction (Module 21)
    │   │   │   ├── pdf_extractor.py
    │   │   │   └── docx_extractor.py
    │   │   │
    │   │   ├── embeddings/           # Vector embedding generation
    │   │   │   └── generator.py
    │   │   │
    │   │   ├── rag/                  # Retrieval-Augmented Generation
    │   │   │   ├── retriever.py
    │   │   │   └── pipeline.py
    │   │   │
    │   │   ├── classifiers/          # Resume / content classification
    │   │   │   └── resume_classifier.py   # (later use)
    │   │   │
    │   │   ├── prompts/              # Prompt templates
    │   │   │   ├── resume_summary.txt
    │   │   │   └── skill_extraction.txt
    │   │   │
    │   │   └── models/               # Model provider configs
    │   │       ├── openai.py
    │   │       └── gemini.py
    │
    │   ├── schemas/                  # API request/response schemas
    │   │   ├── requests.py
    │   │   └── responses.py
    │
    ├── tests/                       # Unit / integration tests
    ├── Dockerfile                   # Docker image for AI/ML service
    ├── requirements.txt             # Python dependencies
    └── README.md


Features

Standalone FastAPI microservice running on port 8001
Internal, backend-facing APIs only
/v1/health and /v1/ready endpoints for liveness and readiness
Configuration management using Pydantic Settings
Secure handling of AI provider keys (OpenAI / Gemini) via environment variables
Structured JSON logging with request tracing
Clear separation between:
API layer
Infrastructure (core)
AI/ML business logic (services)
OpenAPI / Swagger documentation enabled
Designed for Docker and future CI/CD integration

Prerequisites
Python 3.10+
Pip
(Optional) Virtual environment

Install dependencies
cd services/ai-ml
pip install -r requirements.txt

Run the service locally
cd services/ai-ml
python -m uvicorn src.main:app --host 0.0.0.0 --port 8001 --reload

Access endpoints
Swagger UI:
http://localhost:8001/docs

Health check:
http://localhost:8001/v1/health

→ {"status":"healthy", ...}

Readiness check:
http://localhost:8001/v1/ready

→ Indicates whether an AI provider is configured

Inference endpoint (internal):
http://localhost:8001/v1/inference

Configuration

The service loads configuration from environment variables using Pydantic Settings.
Supported variables:
OPENAI_API_KEY
GEMINI_API_KEY
REQUEST_TIMEOUT
ENVIRONMENT

API keys are never logged and are not required at this stage unless real AI calls are implemented.

API Design Notes
This service is not exposed to the frontend
The backend service is the only consumer
/v1/inference acts as a single internal entry point for AI/ML processing
AI internals can evolve without breaking backend integration

Logging & Observability
Structured JSON logging via structlog
Request-level tracing using X-Request-ID
Logs are emitted to stdout (Docker-friendly)

Security & Rate Limiting
security.py exists as a rate limiting placeholder
Actual enforcement can be enabled later without API changes

Docker Support
Dockerfile included
Service can run independently in a container
Designed to be integrated into docker-compose with backend service

