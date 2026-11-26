"""
models/superadmin.py – Pydantic request/response schemas for superadmin auth.
"""

from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional
from datetime import datetime


# ── Request bodies ────────────────────────────────────────────────────────────

class SignupRequest(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator("username")
    @classmethod
    def username_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Username cannot be empty.")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ── Response bodies ───────────────────────────────────────────────────────────

class SuperAdminPublic(BaseModel):
    id: int
    username: str
    email: str
    role: str
    is_active: bool
    last_login_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


class AuthResponse(BaseModel):
    message: str
    token: str
    user: SuperAdminPublic


class SuperAdminListResponse(BaseModel):
    admins: list[SuperAdminPublic]
