"""
utils/dependencies.py – FastAPI dependency to extract and validate
the current superadmin from the Authorization header or cookie.
"""

from fastapi import Depends, HTTPException, status, Request
from utils.auth import decode_access_token


def get_current_superadmin(request: Request) -> dict:
    """
    Reads the JWT from the 'Authorization: Bearer <token>' header.
    Falls back to the 'platform_owner_token' cookie.
    Raises 401 if missing or invalid.
    """
    token: str | None = None

    # 1. Try Authorization header
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):]

    # 2. Fallback: cookie (useful when called from Next.js server-side)
    if not token:
        token = request.cookies.get("platform_owner_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    if payload.get("role") != "superadmin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superadmin access required.",
        )

    return payload


def get_current_user(request: Request) -> dict:
    """
    Reads the JWT from 'Authorization: Bearer <token>' or the
    'iqoo_user_token' cookie. Raises 401 if missing or invalid.
    """
    token: str | None = None

    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[len("Bearer "):]

    if not token:
        token = request.cookies.get("iqoo_user_token")

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    if payload.get("role") != "user":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User access required.",
        )

    return payload
