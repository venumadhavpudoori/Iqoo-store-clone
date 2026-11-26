-- ============================================================
-- Migration: Create users table for storefront customers
-- Run once against PostgreSQL (also auto-created by lib/db.ts):
--   psql -U postgres -d iqoo_platform -f migrations/001_create_users.sql
-- ============================================================

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
