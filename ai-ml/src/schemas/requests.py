from pydantic import BaseModel
from typing import Optional


class InferenceRequest(BaseModel):
    text: str
    task: Optional[str] = "general"
