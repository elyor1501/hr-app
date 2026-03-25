from pydantic import BaseModel, HttpUrl


class ResumeProcessRequest(BaseModel):
    resume_id: str
    file_url: HttpUrl


class ResumeProcessResponse(BaseModel):
    resume_id: str
    status: str
    extracted_text_length: int
    embedding_dimension: int