from pydantic import BaseModel


class InferenceResponse(BaseModel):
    output: str
    model: str
