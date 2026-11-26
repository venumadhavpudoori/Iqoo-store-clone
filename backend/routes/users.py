"""
routes/users.py – FastAPI router for storefront user authentication.

Endpoints:
  POST /users/auth/signup  → Register a new user
  POST /users/auth/login   → Authenticate user and receive JWT
  POST /users/auth/logout  → Stateless logout
  POST /users/auth/oauth   → Upsert/login third-party OAuth user (Google / Facebook)
  GET  /users/auth/me      → Return current user's profile
"""

from fastapi import APIRouter, Depends, HTTPException, status

from models.user import (
    UserSignupRequest,
    UserLoginRequest,
    UserOAuthRequest,
    UserAuthResponse,
    UserPublic,
)
from services.user_service import (
    create_user,
    authenticate_user,
    find_or_create_oauth_user,
    get_user_by_id,
)
from utils.auth import create_access_token
from utils.dependencies import get_current_user

router = APIRouter(prefix="/users/auth", tags=["User Auth"])


def _issue_user_token(user: dict) -> str:
    return create_access_token({
        "id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
        "provider": user["provider"],
    })


@router.post("/signup", response_model=UserAuthResponse, status_code=201)
def user_signup(body: UserSignupRequest):
    user = create_user(
        name=body.name,
        email=body.email,
        password=body.password,
    )
    token = _issue_user_token(user)
    return UserAuthResponse(
        message="Account created successfully.",
        token=token,
        user=UserPublic(**user),
    )


@router.post("/login", response_model=UserAuthResponse, status_code=200)
def user_login(body: UserLoginRequest):
    user = authenticate_user(
        email=body.email,
        password=body.password,
    )
    token = _issue_user_token(user)
    return UserAuthResponse(
        message="Login successful.",
        token=token,
        user=UserPublic(**user),
    )


@router.post("/oauth", response_model=UserAuthResponse, status_code=200)
def user_oauth(body: UserOAuthRequest):
    user = find_or_create_oauth_user(
        provider=body.provider,
        provider_id=body.provider_id,
        email=body.email,
        name=body.name,
        avatar_url=body.avatar_url,
    )
    token = _issue_user_token(user)
    return UserAuthResponse(
        message="OAuth login successful.",
        token=token,
        user=UserPublic(**user),
    )


@router.post("/logout", status_code=200)
def user_logout():
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=UserPublic)
def user_me(current_user: dict = Depends(get_current_user)):
    user = get_user_by_id(current_user["id"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserPublic(**user)
