import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from pydantic import BaseModel
from src.db.session import get_db_session
from src.core.auth import hash_password_async, verify_password_async, create_tokens
from src.core.config import settings
from src.core.redis import get_redis_pool
from src.repositories.user import UserRepository
from src.models.auth import UserCreate, UserResponse, Token, TokenPayload
from src.api.deps import get_current_user
from src.services.email import send_reset_email
from src.db.models import PasswordResetToken, User

router = APIRouter()

USER_CACHE_TTL = 300


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


def _user_cache_key(email: str) -> str:
    return f"hr_app:user:email:{email.lower()}"


async def _get_cached_user(email: str) -> dict | None:
    try:
        redis = await get_redis_pool()
        data = await redis.get(_user_cache_key(email))
        if data:
            return json.loads(data)
        return None
    except Exception:
        return None


async def _set_cached_user(user: User) -> None:
    try:
        redis = await get_redis_pool()
        user_data = {
            "id": str(user.id),
            "email": user.email,
            "hashed_password": user.hashed_password,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
        }
        await redis.setex(_user_cache_key(user.email), USER_CACHE_TTL, json.dumps(user_data))
    except Exception:
        pass


async def _delete_cached_user(email: str) -> None:
    try:
        redis = await get_redis_pool()
        await redis.delete(_user_cache_key(email))
    except Exception:
        pass


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db_session)):
    repo = UserRepository(db)
    if await repo.get_by_email(user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    user_data = user_in.model_dump()
    user_data["hashed_password"] = await hash_password_async(user_data.pop("password"))
    user = await repo.create(**user_data)
    await _set_cached_user(user)
    return user


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db_session)):
    cached = await _get_cached_user(form_data.username)

    if cached:
        if not cached.get("is_active", True):
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        password_valid = await verify_password_async(form_data.password, cached["hashed_password"])
        if not password_valid:
            raise HTTPException(status_code=401, detail="Incorrect email or password")
        return create_tokens(cached["email"], cached["role"])

    repo = UserRepository(db)
    user = await repo.get_by_email(form_data.username)
    if not user or not await verify_password_async(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    await _set_cached_user(user)
    return create_tokens(user.email, user.role)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: TokenPayload = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)):
    cached = await _get_cached_user(current_user.sub)
    if cached:
        return UserResponse(
            id=cached["id"],
            email=cached["email"],
            full_name=cached["full_name"],
            role=cached["role"],
            is_active=cached["is_active"],
        )
    repo = UserRepository(db)
    user = await repo.get_by_email(current_user.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await _set_cached_user(user)
    return user


@router.post("/forgot-password", status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db_session)
):
    repo = UserRepository(db)
    user = await repo.get_by_email(data.email)

    if not user:
        return {"message": "If this email exists, a reset link has been sent"}

    await db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.email == data.email
        )
    )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)

    reset_token = PasswordResetToken(
        email=data.email,
        token=token,
        expires_at=expires_at,
    )
    db.add(reset_token)
    await db.commit()

    await send_reset_email(data.email, token)

    return {"message": "If this email exists, a reset link has been sent"}


@router.post("/reset-password", status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db_session)
):
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token == data.token,
            PasswordResetToken.used == False,
        )
    )
    reset_token = result.scalar_one_or_none()

    if not reset_token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(data.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    repo = UserRepository(db)
    user = await repo.get_by_email(reset_token.email)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    new_hashed = await hash_password_async(data.new_password)
    await repo.update(user.id, hashed_password=new_hashed)
    await _delete_cached_user(reset_token.email)

    reset_token.used = True

    await db.execute(
        delete(PasswordResetToken).where(
            PasswordResetToken.email == reset_token.email
        )
    )

    await db.commit()

    return {"message": "Password reset successfully"}