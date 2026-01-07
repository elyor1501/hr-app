from fastapi import APIRouter, HTTPException

from src.models.requests import InferenceRequest
from src.models.responses import InferenceResponse

router = APIRouter()


@router.post("/inference", response_model=InferenceResponse)
async def run_inference(request: InferenceRequest):
    """
    Internal inference endpoint.
    This is a placeholder implementation.
    """

    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty")

    # Placeholder response (no real AI call yet)
    return InferenceResponse(
        output="Inference pipeline not implemented yet",
        model="placeholder",
    )
