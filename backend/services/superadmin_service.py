"""
services/superadmin_service.py
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
All database business logic for superadmin management.
No SQL ever leaks into route handlers.
"""

from fastapi import HTTPException, status
from database import get_db
from utils.auth import hash_password, verify_password


MAX_SUPERADMINS = 2


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_dict(row) -> dict:
    """Convert a RealDictRow to a plain dict (safe for Pydantic)."""
    return dict(row) if row else {}


# ── Read ──────────────────────────────────────────────────────────────────────

def get_all_superadmins() -> list[dict]:
    """Return all superadmin accounts ordered by creation date."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, username, email, role, is_active, last_login_at, created_at
            FROM platform_superadmins
            WHERE role = 'superadmin'
            ORDER BY created_at ASC
            """
        )
        return [_row_to_dict(r) for r in cur.fetchall()]


def get_superadmin_by_id(admin_id: int) -> dict | None:
    """Return a single superadmin by primary key (no password hash)."""
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, username, email, role, is_active, last_login_at, created_at
            FROM platform_superadmins
            WHERE id = %s AND role = 'superadmin'
            """,
            (admin_id,),
        )
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


def _get_superadmin_by_email_with_hash(email: str) -> dict | None:
    """
    Internal only – returns the row INCLUDING password_hash.
    Never expose this to API responses.
    """
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, username, email, role, is_active,
                   last_login_at, created_at, password_hash
            FROM platform_superadmins
            WHERE email = %s AND role = 'superadmin'
            """,
            (email.lower(),),
        )
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


# ── Create ────────────────────────────────────────────────────────────────────

def create_superadmin(username: str, email: str, password: str) -> dict:
    """
    Register a new superadmin.

    Business rules enforced:
    • Max 2 superadmin accounts platform-wide
    • Email must be unique
    • Password is bcrypt-hashed before storage
    """
    email = email.lower().strip()
    username = username.strip()

    with get_db() as cur:
        # Guard: platform cap
        cur.execute(
            "SELECT COUNT(*) AS cnt FROM platform_superadmins WHERE role = 'superadmin'"
        )
        count = cur.fetchone()["cnt"]
        if count >= MAX_SUPERADMINS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Platform limit reached: only {MAX_SUPERADMINS} superadmin accounts are allowed.",
            )

        # Guard: unique email
        cur.execute(
            "SELECT id FROM platform_superadmins WHERE email = %s",
            (email,),
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        password_hash = hash_password(password)

        cur.execute(
            """
            INSERT INTO platform_superadmins
                (username, email, password_hash, role, is_active)
            VALUES (%s, %s, %s, 'superadmin', true)
            RETURNING id, username, email, role, is_active, last_login_at, created_at
            """,
            (username, email, password_hash),
        )
        return _row_to_dict(cur.fetchone())


# ── Authenticate ──────────────────────────────────────────────────────────────

def authenticate_superadmin(email: str, password: str) -> dict:
    """
    Verify credentials and return the safe (no-hash) admin row.

    Business rules enforced:
    • Generic error message – no email enumeration
    • Account must be active
    • last_login_at is updated on success
    """
    admin = _get_superadmin_by_email_with_hash(email)

    # Constant-time failure path: always call verify_password
    # even if admin is None, using a dummy hash to prevent timing attacks.
    dummy_hash = "$2b$12$xxxxxxxxxxxxxxxxxxxxxxuZLbwE7PanBDrA9lMj6mJsB9UoWxE"
    password_hash = admin["password_hash"] if admin else dummy_hash

    password_valid = verify_password(password, password_hash)

    if not admin or not password_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not admin["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact support.",
        )

    # Stamp last_login_at
    with get_db() as cur:
        cur.execute(
            "UPDATE platform_superadmins SET last_login_at = NOW() WHERE id = %s",
            (admin["id"],),
        )

    # Strip the hash before returning
    admin.pop("password_hash", None)
    return admin


# ── Update / Deactivate ───────────────────────────────────────────────────────

def deactivate_superadmin(admin_id: int) -> None:
    """Soft-disable a superadmin account."""
    with get_db() as cur:
        cur.execute(
            "UPDATE platform_superadmins SET is_active = false WHERE id = %s AND role = 'superadmin'",
            (admin_id,),
        )


def change_password(admin_id: int, new_password: str) -> None:
    """Replace a superadmin's bcrypt password hash."""
    new_hash = hash_password(new_password)
    with get_db() as cur:
        cur.execute(
            "UPDATE platform_superadmins SET password_hash = %s WHERE id = %s AND role = 'superadmin'",
            (new_hash, admin_id),
        )
