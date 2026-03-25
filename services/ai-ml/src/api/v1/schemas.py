from pydantic import BaseModel
from typing import Optional

class ExtractRequest(BaseModel):
    resume_id: str
    file_url: str
    file_type: str

class ExtractResponse(BaseModel):
    resume_id: str
    raw_text: str
    confidence: float