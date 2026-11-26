import { Pool } from "pg";
import fs from "fs";
import path from "path";

let pool: Pool | null = null;
let initialized = false;

function resolveDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  // Fallback: read DATABASE_URL from ../backend/.env if not set in frontend/.env.local
  try {
    const backendEnvPath = path.resolve(process.cwd(), "../backend/.env");
    if (fs.existsSync(backendEnvPath)) {
      const content = fs.readFileSync(backendEnvPath, "utf-8");
      const match = content.match(/^DATABASE_URL=(.+)$/m);
      if (match?.[1]) {
        return match[1].trim().replace(/^["']|["']$/g, "");
      }
    }
  } catch {
    // ignore fallback read errors
  }

  throw new Error(
    "DATABASE_URL is not set. Add DATABASE_URL to frontend/.env.local or backend/.env."
  );
}

export function getPool(): Pool {
  if (!pool) {
    const connectionString = resolveDatabaseUrl();
    pool = new Pool({
      connectionString,
      ssl:
        process.env.NODE_ENV === "production"
          ? { rejectUnauthorized: false }
          : false,
    });

    pool.on("error", (err) => {
      console.error("Unexpected PostgreSQL pool error:", err);
    });
  }
  return pool;
}

/**
 * Ensures the `users` table exists before queries run.
 */
export async function ensureUsersTable(): Promise<void> {
  if (initialized) return;
  const p = getPool();
  await p.query(`
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
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_provider ON users(provider, provider_id);

    CREATE TABLE IF NOT EXISTS threads (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title          VARCHAR(255) NOT NULL,
        content        TEXT         NOT NULL,
        content_html   TEXT         NOT NULL,
        topic_tag      VARCHAR(60)  NOT NULL DEFAULT 'iQOO Connect',
        hashtags       TEXT         NOT NULL DEFAULT '',
        media_url      TEXT,
        views_count    INTEGER      NOT NULL DEFAULT 1,
        likes_count    INTEGER      NOT NULL DEFAULT 0,
        comments_count INTEGER      NOT NULL DEFAULT 0,
        shares_count   INTEGER      NOT NULL DEFAULT 0,
        created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    );
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS topic_tag VARCHAR(60) NOT NULL DEFAULT 'iQOO Connect';
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS hashtags TEXT NOT NULL DEFAULT '';
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS media_url TEXT;
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS views_count INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS likes_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE threads ADD COLUMN IF NOT EXISTS shares_count INTEGER NOT NULL DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_threads_user_id ON threads(user_id);
    CREATE INDEX IF NOT EXISTS idx_threads_created_at ON threads(created_at DESC);
  `);
  initialized = true;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  await ensureUsersTable();
  const p = getPool();
  const client = await p.connect();
  try {
    const result = await client.query(text, params);
    return { rows: result.rows as T[], rowCount: result.rowCount };
  } finally {
    client.release();
  }
}
