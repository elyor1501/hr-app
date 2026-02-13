from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from src.core.config import settings
from src.models.auth import TokenPayload

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)) -> TokenPayload:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        return TokenPayload(**payload)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")