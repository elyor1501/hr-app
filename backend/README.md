# HR App Backend Service

This is the **FastAPI backend service** for the AI-powered HR application.  
It provides core APIs, health checks, and configuration management using Pydantic settings.

---

## 📂 Project Structure
```bash
services/backend/
├── src/
│ ├── main.py # FastAPI app initialization
│ ├── api/ # REST endpoints
│ │ └── health.py # Health and readiness endpoints
│ ├── core/ # Config and logging setup
│ │ ├── config.py
│ │ └── logging.py
│ ├── models/ # Pydantic schemas
│ ├── services/ # Business logic
│ └── repositories/ # DB / external access
├── tests/ # Unit tests
├── Dockerfile # Docker image
├── requirements.txt # Python dependencies
├── pyproject.toml # Python project config (PEP-8, Ruff)
└── README.md

---

## ⚡ Features

- FastAPI application with **async support**
- `/health` and `/ready` endpoints
- Configuration management with **Pydantic Settings**
- CORS enabled for local development (`http://localhost:3000`)
- Structured JSON logging with **structlog**
- Fully **PEP-8 compliant**, passes **Ruff linting**
- Ready for Docker and CI/CD pipelines

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Pip
- Virtual environment (recommended)

### Install dependencies

```bash
cd services/backend
pip install -r requirements.txt

cd services/backend
uvicorn main:app --app-dir src --reload --port 8000

Open in browser / API client:

- Health check: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"healthy"}`
- Readiness: [http://localhost:8000/ready](http://localhost:8000/ready) → `{"status":"ready"}`

---

## 🧹 Linting

Check code quality with **Ruff**:

```bash
cd services/backend
ruff check .
