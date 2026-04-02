"""
MedBios AI — Authentication Router
JWT-based auth with registration and login.
"""
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer

from database import get_db
from models import User
from config import SECRET_KEY, ACCESS_TOKEN_EXPIRE_MINUTES

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

ALGORITHM = "HS256"


# ── Schemas ──

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str
    role: str = "Physician"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


# ── Helpers ──

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Decode JWT and return user. Returns None if no token (allows optional auth).
    Raises 401 only if token is present but invalid.
    """
    if token is None:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def require_auth(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Strict auth dependency — raises 401 if not authenticated."""
    if token is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    user = await get_current_user(token, db)
    if user is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user


# ── Endpoints ──

@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user account."""
    if len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    # Check if email exists
    existing = await db.execute(select(User).where(User.email == payload.email.lower()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        email=payload.email.lower().strip(),
        name=payload.name.strip(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role},
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT token."""
    result = await db.execute(select(User).where(User.email == payload.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": user.id, "email": user.email})
    return TokenResponse(
        access_token=token,
        user={"id": user.id, "email": user.email, "name": user.name, "role": user.role},
    )


@router.get("/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current authenticated user profile."""
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }
