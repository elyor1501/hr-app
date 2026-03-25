from __future__ import annotations

from datetime import datetime
import re
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class BaseSchema(BaseModel):
    """Base Pydantic model with common configuration."""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        str_strip_whitespace=True,
    )


class TimestampSchema(BaseSchema):
    """Schema with created_at and updated_at timestamps."""

    created_at: datetime = Field(
        ...,
        description="Timestamp when the record was created",
    )
    updated_at: datetime = Field(
        ...,
        description="Timestamp when the record was last updated",
    )


class IDSchema(BaseSchema):
    """Schema with UUID primary key."""

    id: UUID = Field(..., description="Unique identifier")


class EmbeddingMixin(BaseSchema):
    """Mixin for models that store vector embeddings."""

    embedding: Optional[List[float]] = Field(
        default=None,
        description="Vector embedding for AI similarity search",
    )


# Phone regex: 9-15 digits, optional + prefix
PHONE_REGEX = re.compile(r"^\+?1?\d{9,15}$")


def validate_phone_number(phone: Optional[str]) -> Optional[str]:
    """Validate phone number format."""
    if phone is None:
        return None

    cleaned = re.sub(r"[\s\-\(\)]", "", phone)

    if not PHONE_REGEX.match(cleaned):
        raise ValueError("Invalid phone format: +1234567890")

    return cleaned