"""
database.py – PostgreSQL connection pool for the FastAPI backend.
Uses psycopg2 with a simple connection-pool wrapper.
"""

import os
import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from contextlib import contextmanager

load_dotenv()

DATABASE_URL: str = os.getenv("DATABASE_URL", "")

# Thread-safe connection pool (min 1, max 10 connections)
_pool: psycopg2.pool.ThreadedConnectionPool | None = None


def get_pool() -> psycopg2.pool.ThreadedConnectionPool:
    global _pool
    if _pool is None:
        _pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            dsn=DATABASE_URL,
        )
    return _pool


@contextmanager
def get_db():
    """
    Context manager that yields a RealDictCursor and handles
    commit / rollback / connection release automatically.

    Usage:
        with get_db() as cursor:
            cursor.execute(...)
            rows = cursor.fetchall()
    """
    db_pool = get_pool()
    conn = db_pool.getconn()
    try:
        conn.autocommit = False
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            yield cursor
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        db_pool.putconn(conn)


def init_db() -> None:
    """Create the platform_superadmins table, trigger, and index if they do not exist."""
    with get_db() as cur:
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS platform_superadmins (
                id               SERIAL PRIMARY KEY,
                username         VARCHAR(80)  NOT NULL,
                email            VARCHAR(255) NOT NULL UNIQUE,
                password_hash    TEXT         NOT NULL,
                role             VARCHAR(20)  NOT NULL DEFAULT 'superadmin'
                                   CHECK (role = 'superadmin'),
                is_active        BOOLEAN      NOT NULL DEFAULT true,
                last_login_at    TIMESTAMPTZ,
                created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            );

            CREATE OR REPLACE FUNCTION set_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_superadmins_updated_at ON platform_superadmins;
            CREATE TRIGGER trg_superadmins_updated_at
              BEFORE UPDATE ON platform_superadmins
              FOR EACH ROW EXECUTE FUNCTION set_updated_at();

            CREATE INDEX IF NOT EXISTS idx_superadmins_email ON platform_superadmins(email);

            CREATE TABLE IF NOT EXISTS users (
                id               SERIAL PRIMARY KEY,
                name             VARCHAR(100) NOT NULL,
                email            VARCHAR(255) NOT NULL UNIQUE,
                password_hash    TEXT,
                provider         VARCHAR(20)  NOT NULL DEFAULT 'local'
                                   CHECK (provider IN ('local', 'google', 'facebook')),
                provider_id      VARCHAR(255),
                avatar_url       TEXT,
                role             VARCHAR(20)  NOT NULL DEFAULT 'user',
                is_active        BOOLEAN      NOT NULL DEFAULT true,
                last_login_at    TIMESTAMPTZ,
                created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
                updated_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
            );

            CREATE OR REPLACE FUNCTION set_users_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
              NEW.updated_at = NOW();
              RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
            CREATE TRIGGER trg_users_updated_at
              BEFORE UPDATE ON users
              FOR EACH ROW EXECUTE FUNCTION set_users_updated_at();

            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);
            """
        )
