import crypto from "node:crypto";
import { sql } from "../db/client";

const SESSION_DAYS = 7;

export async function createSession(userId: number) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

    await sql`
    INSERT INTO sessions (user_id, token, expires_at)
    VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
  `;

    return { token, expiresAt };
}

export async function getSessionUser(token: string) {
    const result = await sql`
    SELECT
      s.token,
      s.expires_at,
      u.id,
      u.name,
      u.email,
      u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
    LIMIT 1
  `;

    const row = result[0];
    if (!row) return null;

    const expiresAt = new Date(row.expires_at);

    if (expiresAt < new Date()) {
        await sql`DELETE FROM sessions WHERE token = ${token}`;
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as "trainer" | "client",
    };
}

export async function deleteSession(token: string) {
    await sql`
    DELETE FROM sessions
    WHERE token = ${token}
  `;
}