import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { hashPassword, createSession, setSessionCookie } from "../../../lib/auth";
import {
    normalizeEmail,
    normalizeText,
    isValidEmail,
    isStrongPassword,
    isValidFullName,
} from "../../../lib/utils/validation";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
    const formData = await request.formData();

    const name = normalizeText(formData.get("name"));
    const email = normalizeEmail(formData.get("email"));
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirm_password") ?? "");

    if (!name || !email || !password || !confirmPassword) {
        return redirect("/clients/register/trainer?error=missing_fields");
    }

    if (!isValidFullName(name)) {
        return redirect("/clients/register/trainer?error=invalid_name");
    }

    if (!isValidEmail(email)) {
        return redirect("/clients/register/trainer?error=invalid_email");
    }

    if (password !== confirmPassword) {
        return redirect("/clients/register/trainer?error=password_mismatch");
    }

    if (!isStrongPassword(password)) {
        return redirect("/clients/register/trainer?error=weak_password");
    }

    const existingUser = await sql`
        SELECT id
        FROM users
        WHERE email = ${email}
        LIMIT 1
    `;

    if (existingUser.length > 0) {
        return redirect("/clients/register/trainer?error=email_exists");
    }

    const passwordHash = await hashPassword(password);

    const insertedUsers = await sql`
        INSERT INTO users (name, email, password_hash, role)
        VALUES (${name}, ${email}, ${passwordHash}, 'trainer')
        RETURNING id, name, email, role
    `;

    const user = insertedUsers[0];

    const session = await createSession(user.id);
    setSessionCookie(cookies, session.token, session.expiresAt);

    return redirect("/dashboard");
};