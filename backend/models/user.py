"""
models/user.py – Pydantic request/response schemas for storefront user auth.
"""

from datetime import datetime
from typing import Literal, Optional
from pydantic import BaseModel, EmailStr, field_validator


class UserSignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name cannot be empty.")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOAuthRequest(BaseModel):
    provider: Literal["google", "facebook"]
    provider_id: str
    email: EmailStr
    name: str
    avatar_url: Optional[str] = None


class UserPublic(BaseModel):
    id: int
    name: str
    email: str
    provider: str
    provider_id: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class UserAuthResponse(BaseModel):
    message: str
    token: str
    user: UserPublic
