from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from src.db.session import get_db_session
from src.core.auth import hash_password, verify_password, create_tokens
from src.repositories.user import UserRepository
from src.models.auth import UserCreate, UserResponse, Token

router = APIRouter()

# Note: No trailing slash here
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db_session)):
    repo = UserRepository(db)
    if await repo.get_by_email(user_in.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user_data = user_in.model_dump()
    # Hash the password before saving
    user_data["hashed_password"] = hash_password(user_data.pop("password"))
    return await repo.create(**user_data)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db_session)):
    repo = UserRepository(db)
    user = await repo.get_by_email(form_data.username)
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    return create_tokens(user.email, user.role)