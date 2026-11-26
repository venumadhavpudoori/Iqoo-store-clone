/**
 * Seed script – creates exactly 2 superadmin accounts.
 *
 * Usage:
 *   npx tsx scripts/seed-superadmins.ts
 *
 * Requires DATABASE_URL in .env.local or environment.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
require("dotenv").config({
  path: require("path").resolve(__dirname, "../.env.local"),
});

import { getPool } from "../lib/db";
import { hashPassword } from "../lib/auth";

const SUPERADMINS = [
  {
    username: "Admin One",
    email: "admin1@iqoo-platform.com",
    password: "Admin@1234!",
  },
  {
    username: "Admin Two",
    email: "admin2@iqoo-platform.com",
    password: "Admin@5678!",
  },
];

async function seed() {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const admin of SUPERADMINS) {
      const { rows } = await client.query(
        "SELECT id FROM platform_superadmins WHERE email = $1",
        [admin.email]
      );

      if (rows.length > 0) {
        console.log(`⚠️  Skipping ${admin.email} – already exists.`);
        continue;
      }

      const hash = await hashPassword(admin.password);
      await client.query(
        `INSERT INTO platform_superadmins (username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'superadmin', true)`,
        [admin.username, admin.email, hash]
      );
      console.log(`✅  Created superadmin: ${admin.email}`);
    }

    await client.query("COMMIT");
    console.log("\n🎉 Seed complete!");
    console.log("────────────────────────────────");
    for (const a of SUPERADMINS) {
      console.log(`  Email:    ${a.email}`);
      console.log(`  Password: ${a.password}`);
      console.log("────────────────────────────────");
    }
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Seed failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
