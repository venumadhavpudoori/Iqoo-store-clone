/**
 * Business logic for superadmin management (platform-owner domain).
 *
 * All database interactions for superadmins live here — no raw SQL
 * in API routes or UI components.
 */

import { query } from "./db";
import { hashPassword, verifyPassword } from "./auth";

export interface SuperAdmin {
  id: number;
  username: string;
  email: string;
  role: "superadmin";
  is_active: boolean;
  last_login_at: Date | null;
  created_at: Date;
}

export interface CreateSuperAdminInput {
  username: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getAllSuperAdmins(): Promise<SuperAdmin[]> {
  const { rows } = await query<SuperAdmin>(
    `SELECT id, username, email, role, is_active, last_login_at, created_at
     FROM platform_superadmins
     WHERE role = 'superadmin'
     ORDER BY created_at ASC`
  );
  return rows;
}

export async function getSuperAdminById(
  id: number
): Promise<SuperAdmin | null> {
  const { rows } = await query<SuperAdmin>(
    `SELECT id, username, email, role, is_active, last_login_at, created_at
     FROM platform_superadmins
     WHERE id = $1 AND role = 'superadmin'`,
    [id]
  );
  return rows[0] ?? null;
}

export async function getSuperAdminByEmail(
  email: string
): Promise<(SuperAdmin & { password_hash: string }) | null> {
  const { rows } = await query<SuperAdmin & { password_hash: string }>(
    `SELECT id, username, email, role, is_active, last_login_at, created_at, password_hash
     FROM platform_superadmins
     WHERE email = $1 AND role = 'superadmin'`,
    [email.toLowerCase()]
  );
  return rows[0] ?? null;
}

// ─── Create ────────────────────────────────────────────────────────────────────

export async function createSuperAdmin(
  input: CreateSuperAdminInput
): Promise<SuperAdmin> {
  const { username, email, password } = input;

  // Guard: max 2 superadmins on the platform
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM platform_superadmins WHERE role = 'superadmin'`
  );
  const currentCount = parseInt(countRows[0].count, 10);
  if (currentCount >= 2) {
    throw new Error(
      "Platform limit reached: only 2 superadmin accounts are allowed."
    );
  }

  // Guard: unique email
  const existing = await getSuperAdminByEmail(email);
  if (existing) {
    throw new Error("An account with this email already exists.");
  }

  const password_hash = await hashPassword(password);

  const { rows } = await query<SuperAdmin>(
    `INSERT INTO platform_superadmins (username, email, password_hash, role, is_active)
     VALUES ($1, $2, $3, 'superadmin', true)
     RETURNING id, username, email, role, is_active, last_login_at, created_at`,
    [username.trim(), email.toLowerCase().trim(), password_hash]
  );
  return rows[0];
}

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function authenticateSuperAdmin(
  input: LoginInput
): Promise<SuperAdmin> {
  const admin = await getSuperAdminByEmail(input.email);

  if (!admin) {
    throw new Error("Invalid email or password.");
  }

  if (!admin.is_active) {
    throw new Error("This account has been deactivated. Contact support.");
  }

  const passwordValid = await verifyPassword(input.password, admin.password_hash);
  if (!passwordValid) {
    throw new Error("Invalid email or password.");
  }

  // Record last login timestamp
  await query(
    `UPDATE platform_superadmins SET last_login_at = NOW() WHERE id = $1`,
    [admin.id]
  );

  // Return without the hash
  const { password_hash: _, ...safeAdmin } = admin;
  return safeAdmin as SuperAdmin;
}

// ─── Update ────────────────────────────────────────────────────────────────────

export async function deactivateSuperAdmin(id: number): Promise<void> {
  await query(
    `UPDATE platform_superadmins SET is_active = false WHERE id = $1 AND role = 'superadmin'`,
    [id]
  );
}

export async function changePassword(
  id: number,
  newPassword: string
): Promise<void> {
  const hash = await hashPassword(newPassword);
  await query(
    `UPDATE platform_superadmins SET password_hash = $1 WHERE id = $2 AND role = 'superadmin'`,
    [hash, id]
  );
}
