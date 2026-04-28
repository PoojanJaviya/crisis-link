"""
Authentication routes for CrisisLink.

Endpoints:
  POST  /api/auth/login        → Staff/Admin login with username + password
  POST  /api/auth/guest-token  → Guest gets a JWT with no credentials
  GET   /api/auth/me           → Return current user info from JWT
"""

import logging

from fastapi import APIRouter, HTTPException, Depends, status

from firebase_config import get_db
from models import LoginRequest, TokenResponse
from auth_utils import (
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
)

logger = logging.getLogger("crisislink.auth")
router = APIRouter()

USERS_COLLECTION = "users"


# ── POST /auth/login ─────────────────────────────────────────────────────────

@router.post("/auth/login", response_model=TokenResponse)
def login(body: LoginRequest):
    """
    Staff / Admin login.

    Looks up the user in Firestore `users` collection,
    verifies bcrypt-hashed password, checks the role matches,
    and returns a signed JWT.
    """
    db = get_db()
    # Query user by username
    users_ref = db.collection(USERS_COLLECTION)
    query = users_ref.where("username", "==", body.username).limit(1).stream()
    user_doc = next(query, None)

    if user_doc is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    user = user_doc.to_dict()

    # Verify password
    if not verify_password(body.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )

    # Verify that the user's role matches the requested role
    if user.get("role") != body.role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"User '{body.username}' does not have the '{body.role}' role.",
        )

    # Create JWT
    token = create_access_token({
        "sub": user["username"],
        "role": user["role"],
        "display_name": user.get("display_name", user["username"]),
    })

    logger.info(f"Login successful: {user['username']} (role={user['role']})")

    return TokenResponse(
        access_token=token,
        role=user["role"],
        display_name=user.get("display_name", user["username"]),
    )


# ── POST /auth/guest-token ───────────────────────────────────────────────────

@router.post("/auth/guest-token", response_model=TokenResponse)
def guest_token():
    """
    Issue a JWT for a guest user — no credentials required.

    Guests can only access the incident-reporting page (POST /incident).
    """
    token = create_access_token({
        "sub": "guest",
        "role": "guest",
        "display_name": "Guest",
    })

    logger.info("Guest token issued.")

    return TokenResponse(
        access_token=token,
        role="guest",
        display_name="Guest",
    )


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user info from the JWT."""
    return {
        "username": user.get("sub"),
        "role": user.get("role"),
        "display_name": user.get("display_name", user.get("sub")),
    }


# ── GET /auth/staff ──────────────────────────────────────────────────────────

@router.get("/auth/staff")
def get_staff_members(user: dict = Depends(require_role("staff", "admin"))):
    """Return a list of all staff members (for assignment dropdowns)."""
    db = get_db()
    docs = db.collection(USERS_COLLECTION).where("role", "==", "staff").stream()

    staff_list = []
    for doc in docs:
        data = doc.to_dict()
        staff_list.append({
            "username": data.get("username"),
            "display_name": data.get("display_name", data.get("username")),
        })

    return staff_list
