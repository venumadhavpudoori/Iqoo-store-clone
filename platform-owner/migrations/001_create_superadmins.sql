-- ============================================================
-- Migration: Create platform_superadmins table
-- Run once against your PostgreSQL database:
--   psql -U postgres -d iqoo_platform -f migrations/001_create_superadmins.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS iqoo_platform;  -- run separately if needed

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

-- Auto-update updated_at
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

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_superadmins_email ON platform_superadmins(email);
