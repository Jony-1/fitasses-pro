import crypto from "node:crypto";
import { sql } from "../db/client";
import { ensureGymSchema } from "../db/ensure-gym-schema";

const SESSION_DAYS = 7;

export async function hashPassword(password: string) {
    const salt = crypto.randomBytes(16).toString("hex");

    const derivedKey = await new Promise<string>((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(key.toString("hex"));
        });
    });

    return `${salt}:${derivedKey}`;
}

export async function verifyPassword(password: string, storedHash: string) {
    const [salt, originalKey] = storedHash.split(":");

    if (!salt || !originalKey) return false;

    const derivedKey = await new Promise<string>((resolve, reject) => {
        crypto.scrypt(password, salt, 64, (err, key) => {
            if (err) reject(err);
            else resolve(key.toString("hex"));
        });
    });

    const originalBuffer = Buffer.from(originalKey, "hex");
    const derivedBuffer = Buffer.from(derivedKey, "hex");

    if (originalBuffer.length !== derivedBuffer.length) return false;

    return crypto.timingSafeEqual(originalBuffer, derivedBuffer);
}

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
    await ensureGymSchema();

    const result = await sql`
    SELECT
      s.token,
      s.expires_at,
      u.id,
      u.name,
      u.email,
      u.role,
      u.gym_id
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
    LIMIT 1
  `;

    const row = result[0];
    if (!row) return null;

    const expiresAt = new Date(row.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt < new Date()) {
        await sql`DELETE FROM sessions WHERE token = ${token}`;
        return null;
    }

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role as "admin" | "gym_manager" | "trainer" | "client",
        gymId: row.gym_id ?? null,
    };
}

export async function deleteSession(token: string) {
    await sql`DELETE FROM sessions WHERE token = ${token}`;
}
