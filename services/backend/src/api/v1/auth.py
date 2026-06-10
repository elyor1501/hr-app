import json
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, func
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from src.db.session import get_db_session
from src.core.auth import hash_password_async, verify_password_async, create_tokens
from src.core.config import settings
from src.core.redis import get_redis_pool
from src.repositories.user import UserRepository
from src.models.auth import UserCreate, UserResponse, Token, TokenPayload
from src.api.deps import get_current_user
from src.services.email import send_reset_email, send_invite_email
from src.db.models import PasswordResetToken, User

router = APIRouter()

USER_CACHE_TTL = 300
INVITE_TOKEN_PREFIX = "hr_app:invite:used:"


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class InviteRequest(BaseModel):
    email: EmailStr


class InviteTokenValidateRequest(BaseModel):
    token: str


class RegisterViaInviteRequest(BaseModel):
    token: str
    full_name: str
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UpdateUserRoleRequest(BaseModel):
    role: str


def _user_cache_key(email: str) -> str:
    return f"hr_app:user:email:{email.lower()}"


def _invite_used_key(token: str) -> str:
    return f"{INVITE_TOKEN_PREFIX}{token}"


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
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
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


def _create_invite_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.invite_token_expire_minutes)
    payload = {
        "sub": email.lower(),
        "type": "invite",
        "exp": expire,
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def _decode_invite_token(token: str) -> str:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "invite":
            raise HTTPException(status_code=400, detail="Invalid invite token")
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid invite token")
        return email
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired invite token")


@router.post("/invite", status_code=200)
async def invite_user(
    data: InviteRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="You are not allowed to invite users")

    repo = UserRepository(db)
    existing = await repo.get_by_email(str(data.email))
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    invite_token = _create_invite_token(str(data.email))
    sent = await send_invite_email(str(data.email), invite_token)
    if not sent:
        raise HTTPException(status_code=500, detail="Failed to send invite email")

    return {"message": "Invite sent successfully"}


@router.post("/invite/validate", status_code=200)
async def validate_invite_token(data: InviteTokenValidateRequest):
    email = _decode_invite_token(data.token)

    try:
        redis = await get_redis_pool()
        used = await redis.get(_invite_used_key(data.token))
        if used:
            raise HTTPException(status_code=400, detail="This invite link has already been used")
    except HTTPException:
        raise
    except Exception:
        pass

    return {"email": email}


@router.post("/register-via-invite", response_model=UserResponse, status_code=201)
async def register_via_invite(
    data: RegisterViaInviteRequest,
    db: AsyncSession = Depends(get_db_session),
):
    email = _decode_invite_token(data.token)

    try:
        redis = await get_redis_pool()
        used = await redis.get(_invite_used_key(data.token))
        if used:
            raise HTTPException(status_code=400, detail="This invite link has already been used")
    except HTTPException:
        raise
    except Exception:
        pass

    if len(data.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")

    repo = UserRepository(db)
    existing = await repo.get_by_email(email)
    if existing:
        raise HTTPException(status_code=400, detail="This email is already registered")

    hashed = await hash_password_async(data.password)
    user = await repo.create(
        email=email,
        hashed_password=hashed,
        full_name=data.full_name,
        role="recruiter",
    )

    try:
        redis = await get_redis_pool()
        await redis.setex(
            _invite_used_key(data.token),
            settings.invite_token_expire_minutes * 60,
            "1",
        )
    except Exception:
        pass

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


@router.post("/refresh", response_model=Token)
async def refresh_token(data: RefreshTokenRequest, db: AsyncSession = Depends(get_db_session)):
    try:
        payload = jwt.decode(
            data.refresh_token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm]
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    cached = await _get_cached_user(email)
    if cached:
        return create_tokens(cached["email"], cached["role"])

    repo = UserRepository(db)
    user = await repo.get_by_email(email)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User session expired. Please login again.")

    await _set_cached_user(user)
    return create_tokens(user.email, user.role)


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: TokenPayload = Depends(get_current_user), db: AsyncSession = Depends(get_db_session)):
    repo = UserRepository(db)
    user = await repo.get_by_email(current_user.sub)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await _set_cached_user(user)
    return user


@router.get("/users", status_code=200)
async def list_users(
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = result.scalars().all()

    return [
        {
            "id": str(u.id),
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        }
        for u in users
    ]


@router.patch("/users/{user_id}/role", status_code=200)
async def update_user_role(
    user_id: str,
    data: UpdateUserRoleRequest,
    current_user: TokenPayload = Depends(get_current_user),
    db: AsyncSession = Depends(get_db_session),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized")

    if data.role not in ["admin", "recruiter"]:
        raise HTTPException(status_code=400, detail="Role must be admin or recruiter")

    from uuid import UUID
    result = await db.execute(
        select(User).where(User.id == UUID(user_id))
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.email.lower() == current_user.sub.lower() and data.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access")

    user.role = data.role
    user.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(user)

    await _delete_cached_user(user.email)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "is_active": user.is_active,
    }


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
            func.lower(PasswordResetToken.email) == user.email.lower()
        )
    )

    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.reset_token_expire_minutes)

    reset_token = PasswordResetToken(
        email=user.email,
        token=token,
        expires_at=expires_at,
    )
    db.add(reset_token)
    await db.commit()

    email_sent = await send_reset_email(user.email, token)

    if not email_sent:
        print(f"[WARN] Reset email failed to send to {user.email}")

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
            func.lower(PasswordResetToken.email) == reset_token.email.lower()
        )
    )

    await db.commit()

    return {"message": "Password reset successfully"}