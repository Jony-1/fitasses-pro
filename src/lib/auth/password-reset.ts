import crypto from "node:crypto";
import { sql } from "../db/client";
import { ensureGymSchema } from "../db/ensure-gym-schema";

const RESET_TOKEN_TTL_HOURS = 24;

export async function ensurePasswordResetSchema() {
  await ensureGymSchema();

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      expires_at TIMESTAMP NOT NULL,
      used_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id, created_at DESC)`;
}

export function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getResetTokenExpiresAt() {
  return new Date(Date.now() + RESET_TOKEN_TTL_HOURS * 60 * 60 * 1000);
}

export async function createPasswordResetToken(userId: number) {
  await ensurePasswordResetSchema();

  const token = createResetToken();
  const tokenHash = hashResetToken(token);
  const expiresAt = getResetTokenExpiresAt();

  await sql`
    INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
    VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()})
  `;

  return { token, expiresAt };
}

export async function consumePasswordResetToken(token: string) {
  await ensurePasswordResetSchema();

  const tokenHash = hashResetToken(token);
  const rows = await sql`
    SELECT id, user_id, expires_at, used_at
    FROM password_reset_tokens
    WHERE token_hash = ${tokenHash}
    LIMIT 1
  ` as Array<{ id: number; user_id: number; expires_at: string | Date; used_at: string | Date | null }>;

  const row = rows[0];

  if (!row) return null;

  const expiresAt = new Date(row.expires_at);

  if (row.used_at || expiresAt < new Date()) {
    return null;
  }

  await sql`
    UPDATE password_reset_tokens
    SET used_at = NOW()
    WHERE id = ${row.id}
  `;

  return { userId: row.user_id };
}
