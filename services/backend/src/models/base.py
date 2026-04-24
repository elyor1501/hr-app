from __future__ import annotations

from datetime import datetime
import re
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampSchema(BaseSchema):
    created_at: datetime = Field(
        ...,
        description="Timestamp when the record was created",
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the record was last updated",
    )


class IDSchema(BaseSchema):
    id: UUID = Field(..., description="Unique identifier")


class EmbeddingMixin(BaseSchema):
    embedding: Optional[List[float]] = Field(
        default=None,
        description="Vector embedding for AI similarity search",
    )


PHONE_REGEX = re.compile(r"^\+?1?\d{9,15}$")


def validate_phone_number(phone: Optional[str]) -> Optional[str]:
    if phone is None:
        return None
    if not phone.strip():
        return None
    cleaned = re.sub(r"[\s\-\(\)]", "", phone)
    if not PHONE_REGEX.match(cleaned):
        return None
    return cleaned