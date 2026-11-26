"""
routes/auth.py – FastAPI router for superadmin authentication.

Endpoints:
  POST /auth/signup   → Register a new superadmin (max 2 allowed)
  POST /auth/login    → Authenticate and receive a JWT
  POST /auth/logout   → Stateless logout (client must discard token/cookie)
  GET  /auth/me       → Return the current user's profile
  GET  /auth/admins   → Return all superadmin accounts (protected)
"""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from models.superadmin import (
    SignupRequest,
    LoginRequest,
    AuthResponse,
    SuperAdminPublic,
    SuperAdminListResponse,
)
from services.superadmin_service import (
    create_superadmin,
    authenticate_superadmin,
    get_all_superadmins,
    get_superadmin_by_id,
)
from utils.auth import create_access_token
from utils.dependencies import get_current_superadmin

router = APIRouter(prefix="/auth", tags=["Superadmin Auth"])


# ── POST /auth/signup ─────────────────────────────────────────────────────────

@router.post("/signup", response_model=AuthResponse, status_code=201)
def signup(body: SignupRequest):
    """
    Register a new superadmin account.
    Enforces the platform-wide cap of 2 superadmins.
    Auto-issues a JWT so the user is immediately logged in.
    """
    admin = create_superadmin(
        username=body.username,
        email=body.email,
        password=body.password,
    )

    token = create_access_token({
        "id": admin["id"],
        "email": admin["email"],
        "username": admin["username"],
        "role": admin["role"],
    })

    return AuthResponse(
        message="Superadmin account created successfully.",
        token=token,
        user=SuperAdminPublic(**admin),
    )


# ── POST /auth/login ──────────────────────────────────────────────────────────

@router.post("/login", response_model=AuthResponse, status_code=200)
def login(body: LoginRequest):
    """
    Authenticate a superadmin with email + password.
    Returns a JWT on success; updates last_login_at in the database.
    """
    admin = authenticate_superadmin(
        email=body.email,
        password=body.password,
    )

    token = create_access_token({
        "id": admin["id"],
        "email": admin["email"],
        "username": admin["username"],
        "role": admin["role"],
    })

    return AuthResponse(
        message="Login successful.",
        token=token,
        user=SuperAdminPublic(**admin),
    )


# ── POST /auth/logout ─────────────────────────────────────────────────────────

@router.post("/logout", status_code=200)
def logout():
    """
    Stateless logout.
    The client (Next.js API route) is responsible for clearing the
    httpOnly cookie. This endpoint confirms the action.
    """
    return {"message": "Logged out successfully."}


# ── GET /auth/me ──────────────────────────────────────────────────────────────

@router.get("/me", response_model=SuperAdminPublic)
def me(current_user: dict = Depends(get_current_superadmin)):
    """Return the currently authenticated superadmin's profile."""
    admin = get_superadmin_by_id(current_user["id"])
    if not admin:
        from fastapi import HTTPException, status
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Admin not found.")
    return SuperAdminPublic(**admin)


# ── GET /auth/admins ──────────────────────────────────────────────────────────

@router.get("/admins", response_model=SuperAdminListResponse)
def list_admins(current_user: dict = Depends(get_current_superadmin)):
    """Return all superadmin accounts (requires authentication)."""
    admins = get_all_superadmins()
    return SuperAdminListResponse(admins=[SuperAdminPublic(**a) for a in admins])
