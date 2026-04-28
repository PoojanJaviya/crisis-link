"""
Pydantic models for CrisisLink request validation and response shapes.
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


# ── Auth Models ───────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    """Body for POST /auth/login — Staff or Admin login."""
    username: str = Field(..., min_length=1, max_length=50)
    password: str = Field(..., min_length=1, max_length=128)
    role: Literal["staff", "admin"] = Field(
        ..., description="Role the user is trying to log in as"
    )


class TokenResponse(BaseModel):
    """JWT token response returned after successful login."""
    access_token: str
    token_type: str = "bearer"
    role: str
    display_name: str


# ── Request Models ────────────────────────────────────────────────────────────

class CreateIncidentRequest(BaseModel):
    """Body for POST /incident — Guest creates a new emergency."""
    type: Literal["fire", "medical", "security"] = Field(
        ..., description="Category of the emergency"
    )
    location: str = Field(
        ..., min_length=1, max_length=100, description="e.g. 'Room 203', 'Lobby'"
    )
    description: Optional[str] = Field(
        None, max_length=500, description="Optional extra details"
    )


class UpdateIncidentRequest(BaseModel):
    """Body for PATCH /incident/{id} — Staff updates an existing incident."""
    status: Optional[Literal["pending", "in-progress", "resolved"]] = Field(
        None, description="New status of the incident"
    )
    assigned_to: Optional[str] = Field(
        None, max_length=100, description="Name of the staff member handling this"
    )


# ── Response Models ───────────────────────────────────────────────────────────

class IncidentResponse(BaseModel):
    """Shape of a single incident returned by the API."""
    id: str
    type: str
    location: str
    description: Optional[str]
    status: str
    assigned_to: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
