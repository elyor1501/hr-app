# HR-app - candidate matching
AI powered HR application
- Project Board: [Link](https://github.com/users/elyor1501/projects/1)
- Structure:
```
hr-app/
├── services/
│   ├── ai-ml/                 # AI/ML Service 
│   │   ├── src/
│   │   │   ├── extractors/    # CV parsing (PDF/DOCX)
│   │   │   ├── classifiers/   # Content classification
│   │   │   ├── embeddings/    # Vector embedding generation
│   │   │   ├── rag/           # RAG pipeline
│   │   │   ├── prompts/       # Few-shot, CoT templates
│   │   │   └── models/        # Model configs (Gemini/OpenAI)
│   │   ├── api/               # Internal API
│   │   ├── tests/
│   │   └── Dockerfile
│   │
│   ├── backend/               # FastAPI Backend
│   │   ├── src/
│   │   │   ├── api/           # REST endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── repositories/  # Supabase/pgvector access
│   │   │   └── models/        # Pydantic schemas
│   │   ├── tests/
│   │   └── Dockerfile
│   │
│   └── frontend/              # Frontend
│
├── shared/                    # Shared contracts/schemas
│   └── schemas/               # Pydantic models for API contracts
│
├── .github/
│   ├── workflows/             # CI/CD pipelines
│   ├── ISSUE_TEMPLATE/        # Issue templates per component
│   └── project-automation.yml
│
└── docker-compose.yml
```
