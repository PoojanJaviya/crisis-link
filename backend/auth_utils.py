"""
Authentication utilities for CrisisLink.

Provides:
  - JWT token creation / decoding
  - Password hashing & verification (bcrypt via passlib)
  - FastAPI dependencies for role-based access control
"""

import os
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Optional

import jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

logger = logging.getLogger("crisislink.auth")

# ── Config ────────────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "crisislink-dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "1440"))  # 24 h default

# ── Password Hashing ─────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain, hashed)


# ── JWT Tokens ────────────────────────────────────────────────────────────────

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT.

    `data` should contain at least {"sub": "<username>", "role": "<role>"}.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decode and validate a JWT. Raises HTTPException on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired.",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


# ── FastAPI Dependencies ──────────────────────────────────────────────────────

# This scheme extracts the Bearer token from the Authorization header.
_bearer_scheme = HTTPBearer(auto_error=True)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """
    FastAPI dependency — decodes the JWT from the Authorization header
    and returns the payload dict (contains 'sub', 'role', etc.).
    """
    payload = decode_access_token(credentials.credentials)
    username = payload.get("sub")
    role = payload.get("role")
    if not username or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
        )
    return payload


def require_role(*allowed_roles: str):
    """
    Returns a FastAPI dependency that checks the user's role.

    Usage:
        @router.get("/admin-only", dependencies=[Depends(require_role("admin"))])
        def admin_endpoint(): ...

    Or inject the user:
        def endpoint(user = Depends(require_role("staff", "admin"))): ...
    """

    async def _role_checker(
        user: dict = Depends(get_current_user),
    ) -> dict:
        if user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role(s): {', '.join(allowed_roles)}",
            )
        return user

    return _role_checker
