/**
 * Business logic for storefront user management (frontend domain).
 * Handles local email/password signup & login as well as third-party
 * OAuth (Google / Facebook) account linking & creation.
 */

import { query } from "./db";
import { AuthProvider, hashPassword, verifyPassword } from "./auth";

export interface User {
  id: number;
  name: string;
  email: string;
  provider: AuthProvider;
  provider_id: string | null;
  avatar_url: string | null;
  role: "user";
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export interface SignupInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface OAuthUserInput {
  provider: Exclude<AuthProvider, "local">;
  providerId: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getUserById(id: number): Promise<User | null> {
  const { rows } = await query<User>(
    `SELECT id, name, email, provider, provider_id, avatar_url, role, is_active, last_login_at, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getUserByEmailWithHash(
  email: string
): Promise<(User & { password_hash: string | null }) | null> {
  const { rows } = await query<User & { password_hash: string | null }>(
    `SELECT id, name, email, provider, provider_id, avatar_url, role, is_active, last_login_at, created_at, password_hash
     FROM users
     WHERE email = $1`,
    [email.toLowerCase().trim()]
  );
  return rows[0] ?? null;
}

// ─── Local Signup ──────────────────────────────────────────────────────────────

export async function createUser(input: SignupInput): Promise<User> {
  const name = input.name.trim();
  const email = input.email.toLowerCase().trim();

  const existing = await getUserByEmailWithHash(email);
  if (existing) {
    if (existing.provider !== "local" && !existing.password_hash) {
      throw new Error(
        `This email is registered with ${existing.provider}. Please sign in with ${existing.provider}.`
      );
    }
    throw new Error("An account with this email already exists.");
  }

  const passwordHash = await hashPassword(input.password);

  const { rows } = await query<User>(
    `INSERT INTO users (name, email, password_hash, provider, role, is_active)
     VALUES ($1, $2, $3, 'local', 'user', true)
     RETURNING id, name, email, provider, provider_id, avatar_url, role, is_active, last_login_at, created_at`,
    [name, email, passwordHash]
  );
  return rows[0];
}

// ─── Local Login ───────────────────────────────────────────────────────────────

export async function authenticateUser(input: LoginInput): Promise<User> {
  const user = await getUserByEmailWithHash(input.email);

  if (!user) {
    throw new Error("Invalid email or password.");
  }

  if (!user.is_active) {
    throw new Error("Your account has been deactivated.");
  }

  if (!user.password_hash) {
    throw new Error(
      `This account uses ${user.provider} sign-in. Please continue with ${user.provider}.`
    );
  }

  const valid = await verifyPassword(input.password, user.password_hash);
  if (!valid) {
    throw new Error("Invalid email or password.");
  }

  await query(`UPDATE users SET last_login_at = NOW() WHERE id = $1`, [user.id]);

  const { password_hash: _, ...safeUser } = user;
  return safeUser;
}

// ─── OAuth (Google & Facebook) ─────────────────────────────────────────────────

export async function findOrCreateOAuthUser(
  input: OAuthUserInput
): Promise<User> {
  const email = input.email.toLowerCase().trim();
  const existing = await getUserByEmailWithHash(email);

  if (existing) {
    if (!existing.is_active) {
      throw new Error("Your account has been deactivated.");
    }

    // Update last login and fill in provider details / avatar if missing
    const { rows } = await query<User>(
      `UPDATE users
       SET last_login_at = NOW(),
           avatar_url = COALESCE($1, avatar_url),
           provider_id = COALESCE(provider_id, $2)
       WHERE id = $3
       RETURNING id, name, email, provider, provider_id, avatar_url, role, is_active, last_login_at, created_at`,
      [input.avatarUrl ?? null, input.providerId, existing.id]
    );
    return rows[0];
  }

  const { rows } = await query<User>(
    `INSERT INTO users (name, email, password_hash, provider, provider_id, avatar_url, role, is_active, last_login_at)
     VALUES ($1, $2, NULL, $3, $4, $5, 'user', true, NOW())
     RETURNING id, name, email, provider, provider_id, avatar_url, role, is_active, last_login_at, created_at`,
    [
      input.name.trim(),
      email,
      input.provider,
      input.providerId,
      input.avatarUrl ?? null,
    ]
  );
  return rows[0];
}
