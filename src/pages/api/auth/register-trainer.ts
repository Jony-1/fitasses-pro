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
    try {
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

        // Obtener el gimnasio principal (el primero)
        const gymRows = await sql`
            SELECT id
            FROM gyms
            ORDER BY id ASC
            LIMIT 1
        `;

        const gymId = gymRows.length > 0 ? gymRows[0].id : null;

        const passwordHash = await hashPassword(password);

        const insertedUsers = await sql`
            INSERT INTO users (name, email, password_hash, role, gym_id)
            VALUES (${name}, ${email}, ${passwordHash}, 'trainer', ${gymId})
            RETURNING id, name, email, role
        `;

        if (insertedUsers.length === 0) {
            console.error("Trainer insertion failed, no ID returned");
            return redirect("/clients/register/trainer?error=server_error");
        }

        const user = insertedUsers[0];
        const session = await createSession(user.id);
        setSessionCookie(cookies, session.token, session.expiresAt);

        return redirect("/dashboard");
    } catch (error) {
        console.error("Trainer registration error:", error);
        console.error("Error details:", {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : undefined
        });
        return redirect("/clients/register/trainer?error=server_error");
    }
};
