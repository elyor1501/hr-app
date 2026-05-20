import asyncio
import bcrypt
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt
from src.core.config import settings


def hash_password(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt(rounds=10)
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


async def hash_password_async(password: str) -> str:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, hash_password, password)


async def verify_password_async(plain_password: str, hashed_password: str) -> bool:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, verify_password, plain_password, hashed_password)


def create_tokens(subject: Union[str, Any], role: str) -> dict:
    access_expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    refresh_expire = datetime.utcnow() + timedelta(days=settings.refresh_token_expire_days)

    access_payload = {
        "exp": access_expire,
        "sub": str(subject),
        "role": role,
        "type": "access"
    }
    refresh_payload = {
        "exp": refresh_expire,
        "sub": str(subject),
        "type": "refresh"
    }

    return {
        "access_token": jwt.encode(
            access_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        ),
        "refresh_token": jwt.encode(
            refresh_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm
        ),
        "token_type": "bearer"
    }