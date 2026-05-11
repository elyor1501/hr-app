import logging

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/structure-requirement", tags=["Requirement Doc Extraction"])
logger = logging.getLogger(__name__)


class RequirementStructureRequest(BaseModel):
    doc_id: str
    raw_text: str = Field(..., min_length=1)


# Endpoint is retired: callers receive an empty structured_data payload.
# Job descriptions are now stored as full raw text and matched via vector similarity,
# so per-JD LLM structuring adds cost and latency with no downstream consumer.
@router.post("")
async def structure_requirement_doc(payload: RequirementStructureRequest):
    logger.info("structure_requirement_noop", extra={"doc_id": payload.doc_id})
    return {
        "source_file": payload.doc_id,
        "structured_data": {},
    }
