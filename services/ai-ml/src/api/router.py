from fastapi import APIRouter

from api.v1.health import router as health_router
from api.v1.inference import router as inference_router
from api.v1.embeddings import router as embeddings_router
from api.v1.resumes import router as resumes_router
from api.v1.extract import router as extract_router
from api.v1.structure import router as structure_router
from api.v1.match import router as match_router
from api.v1.search import router as search_router
from api.v1.requirement_doc_structure import router as requirement_doc_structure_router

api_router = APIRouter(prefix="/api")

api_router.include_router(health_router, prefix="/v1", tags=["health"])
api_router.include_router(inference_router, prefix="/v1/inference", tags=["inference"])
api_router.include_router(embeddings_router, prefix="/v1", tags=["embeddings"])
api_router.include_router(resumes_router, prefix="/v1/resumes", tags=["resumes"])
api_router.include_router(extract_router, prefix="/v1", tags=["extraction"])
api_router.include_router(structure_router, prefix="/v1", tags=["structure"])
api_router.include_router(match_router, prefix="/v1", tags=["match"])
api_router.include_router(search_router, prefix="/v1", tags=["search"])
api_router.include_router(requirement_doc_structure_router, prefix="/v1", tags=["requirement-doc-extraction"])