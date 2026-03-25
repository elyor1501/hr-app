# HR App Backend Service

FastAPI backend service for the AI-powered HR application with PostgreSQL and pgvector support.

---

```bash
## 📂 Project Structure
services/backend/
├── src/
│   ├── main.py                 # FastAPI app initialization & lifecycle
│   ├── api/                    # REST endpoints
│   │   ├── health.py           # Service health & readiness
│   │   └── v1/                 # Versioned API logic
│   │       ├── candidates.py   # Candidate CRUD & Resume uploads
│   │       ├── jobs.py         # Job CRUD & filtering
│   │       ├── search.py       # AI Semantic search
│   │       └── matching.py     # AI Candidate matching
│   ├── core/                   # Config and logging setup
│   │   ├── config.py           # Pydantic Settings
│   │   └── logging.py          # Structured Logging (structlog)
│   ├── db/                     # Database layer
│   │   ├── session.py          # Connection pool management
│   │   ├── base.py             # Declarative base & ID mixins
│   │   └── models.py           # SQLAlchemy ORM Models
│   ├── models/                 # Pydantic schemas (Validation)
│   ├── services/               # Business logic
│   │   ├── ai_client.py        # Resilient AI/ML Service Client
│   │   └── files.py            # File upload & storage logic
│   └── repositories/           # Data access layer
├── tests/                      # Comprehensive test suite (65+ tests)
├── Dockerfile                  # Production container config
├── docker-compose.yml          # Full-stack orchestration
├── pyproject.toml              # Ruff & Pytest configuration
└── requirements.txt            # Python dependencies

```

text


---

## Features

- **Asynchronous API:** Built with FastAPI for high-performance non-blocking operations.
- **AI Semantic Search:** Natural language search using pgvector and HNSW indexing.
- **Resilient AI Client:** Service-to-service communication with Circuit Breaker and Retry patterns.
- **Automated CV Handling:** Secure PDF/Docx upload and processing with "Zombie File" prevention.
- **Advanced Data layer:** SQLAlchemy 2.0 Async ORM with Soft Delete and status filtering.
- **Strict Validation:** Pydantic v2 schemas with automatic name and skill normalization.
- **Production Observability:** Structured JSON logging and built-in health probes.

---

## Getting Started

### Prerequisites

- Python 3.10+
- Docker Desktop
- PostgreSQL with pgvector (via Docker)

### Database Setup

```powershell
# 1. Start PostgreSQL with pgvector (if not using compose)
docker run -d --name hr-postgres -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=hr_app -p 5432:5432 pgvector/pgvector:pg16

# 2. Enable pgvector extension
docker exec -it hr-postgres psql -U postgres -d hr_app -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. Create dedicated test database
docker exec -it hr-postgres psql -U postgres -d hr_app -c "CREATE DATABASE hr_app_test;"

# 4. Verify Extension
docker exec -it hr-postgres psql -U postgres -d hr_app -c "\dx"
```

### AI Matching Algorithm

The /match endpoint uses a weighted scoring system to rank candidates based on their suitability for a specific job:
```
  Component	      Weight	                Logic
Skills Match	   50%	   Direct comparison of required vs. possessed skills using AI analysis.
Experience	       30%	   Assessment of professional tenure and industry relevance.
Level/Education	   20%	   Alignment of candidate seniority with job requirements.
```

### Testing & Quality

Running Automated Tests

The suite includes 65 tests covering Database connections, Pydantic validation, CRUD logic, and AI Client resiliency.
```
docker-compose exec backend pytest tests/ -v

```
### API Endpoints

Once the application is running, you can access the interactive documentation at:
```
Swagger UI: http://localhost:8000/docs

Redoc: http://localhost:8000/redoc
```
Key Endpoints

```

Method	   Endpoint	                      Description
GET	    /ready	                    Database & Service health check
POST	/api/v1/candidates/	        Create candidate with PDF Resume upload
GET	    /api/v1/jobs/	            List jobs with keyword search & status filters
POST	/api/v1/search/candidates	Natural language AI search
POST	/api/v1/match/match	        Get detailed job-candidate matching scores

```