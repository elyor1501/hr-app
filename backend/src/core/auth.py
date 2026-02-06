import bcrypt
from datetime import datetime, timedelta
from typing import Any, Union, Optional
from jose import jwt
from src.core.config import settings

def hash_password(password: str) -> str:
    """Securely hash a password using bcrypt."""
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(pwd_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hash."""
    return bcrypt.checkpw(
        plain_password.encode('utf-8'), 
        hashed_password.encode('utf-8')
    )

def create_tokens(subject: Union[str, Any], role: str) -> dict:
    """Generate JWT access and refresh tokens."""
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