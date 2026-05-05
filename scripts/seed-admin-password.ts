#!/usr/bin/env tsx
import bcrypt from "bcryptjs";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env["DATABASE_URL"] });

const password = process.argv[2] ?? "Admin224!";
const hash = await bcrypt.hash(password, 12);

const res = await pool.query<{ id: number; email: string; name: string }>(
  `UPDATE users SET password_hash = $1 WHERE role = 'admin' AND password_hash IS NULL RETURNING id, email, name`,
  [hash],
);

if (res.rows.length === 0) {
  console.log("INFO: No admin without a password found — skipping (password already set or no admin user exists).");
} else {
  console.log("✅ Password set for:", res.rows.map((r) => `${r.name} <${r.email}>`).join(", "));
}

await pool.end();
