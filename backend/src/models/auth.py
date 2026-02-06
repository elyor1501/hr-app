from typing import Optional
from pydantic import EmailStr, Field
from src.models.base import BaseSchema, IDSchema, TimestampSchema
from src.models.enums import UserRole

class UserBase(BaseSchema):
    email: EmailStr
    full_name: str
    role: UserRole = UserRole.RECRUITER

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserResponse(UserBase, IDSchema, TimestampSchema):
    is_active: bool

class Token(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenPayload(BaseSchema):
    sub: Optional[str] = None # user email
    role: Optional[str] = None
    type: Optional[str] = None