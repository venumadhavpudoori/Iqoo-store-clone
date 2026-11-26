"""
services/user_service.py
━━━━━━━━━━━━━━━━━━━━━━━━
All PostgreSQL business logic for storefront users (local & OAuth).
"""

from fastapi import HTTPException, status
from database import get_db
from utils.auth import hash_password, verify_password


def _row_to_dict(row) -> dict:
    return dict(row) if row else {}


def get_user_by_id(user_id: int) -> dict | None:
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, name, email, provider, provider_id, avatar_url,
                   role, is_active, last_login_at, created_at
            FROM users
            WHERE id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


def _get_user_by_email_with_hash(email: str) -> dict | None:
    with get_db() as cur:
        cur.execute(
            """
            SELECT id, name, email, provider, provider_id, avatar_url,
                   role, is_active, last_login_at, created_at, password_hash
            FROM users
            WHERE email = %s
            """,
            (email.lower().strip(),),
        )
        row = cur.fetchone()
        return _row_to_dict(row) if row else None


def create_user(name: str, email: str, password: str) -> dict:
    clean_email = email.lower().strip()
    clean_name = name.strip()

    existing = _get_user_by_email_with_hash(clean_email)
    if existing:
        if existing["provider"] != "local" and not existing["password_hash"]:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"This email is registered with {existing['provider']}. Please sign in with {existing['provider']}.",
            )
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    pw_hash = hash_password(password)

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO users (name, email, password_hash, provider, role, is_active)
            VALUES (%s, %s, %s, 'local', 'user', true)
            RETURNING id, name, email, provider, provider_id, avatar_url,
                      role, is_active, last_login_at, created_at
            """,
            (clean_name, clean_email, pw_hash),
        )
        return _row_to_dict(cur.fetchone())


def authenticate_user(email: str, password: str) -> dict:
    user = _get_user_by_email_with_hash(email)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user["is_active"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
        )

    if not user["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"This account uses {user['provider']} sign-in. Please continue with {user['provider']}.",
        )

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    with get_db() as cur:
        cur.execute(
            "UPDATE users SET last_login_at = NOW() WHERE id = %s",
            (user["id"],),
        )

    user.pop("password_hash", None)
    return user


def find_or_create_oauth_user(
    provider: str,
    provider_id: str,
    email: str,
    name: str,
    avatar_url: str | None = None,
) -> dict:
    clean_email = email.lower().strip()
    clean_name = name.strip()
    existing = _get_user_by_email_with_hash(clean_email)

    if existing:
        if not existing["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your account has been deactivated.",
            )

        with get_db() as cur:
            cur.execute(
                """
                UPDATE users
                SET last_login_at = NOW(),
                    avatar_url = COALESCE(%s, avatar_url),
                    provider_id = COALESCE(provider_id, %s)
                WHERE id = %s
                RETURNING id, name, email, provider, provider_id, avatar_url,
                          role, is_active, last_login_at, created_at
                """,
                (avatar_url, provider_id, existing["id"]),
            )
            return _row_to_dict(cur.fetchone())

    with get_db() as cur:
        cur.execute(
            """
            INSERT INTO users
                (name, email, password_hash, provider, provider_id, avatar_url, role, is_active, last_login_at)
            VALUES (%s, %s, NULL, %s, %s, %s, 'user', true, NOW())
            RETURNING id, name, email, provider, provider_id, avatar_url,
                      role, is_active, last_login_at, created_at
            """,
            (clean_name, clean_email, provider, provider_id, avatar_url),
        )
        return _row_to_dict(cur.fetchone())
