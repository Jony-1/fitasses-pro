import crypto from "node:crypto";
import { sql } from "../db/client";
import type { AstroCookies } from "astro";
import { ensureGymSchema } from "../db/ensure-gym-schema";

const SESSION_DAYS = 5;
const SESSION_COOKIE_NAME = "session";

export async function createSession(userId: number) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(
        Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000,
    );

    await sql`
        INSERT INTO sessions (user_id, token, expires_at)
        VALUES (${userId}, ${token}, ${expiresAt.toISOString()})
    `;

    return { token, expiresAt };
}

export function setSessionCookie(
    cookies: AstroCookies,
    token: string,
    expiresAt: Date,
) {
    cookies.set(SESSION_COOKIE_NAME, token, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        secure: import.meta.env.PROD,
        expires: expiresAt,
    });
}

export function clearSessionCookie(cookies: AstroCookies) {
    cookies.delete(SESSION_COOKIE_NAME, {
        path: "/",
    });
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

    if (expiresAt < new Date()) {
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
    await sql`
        DELETE FROM sessions
        WHERE token = ${token}
    `;
}
