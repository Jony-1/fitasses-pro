import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { verifyPassword } from "../../../lib/auth/password";
import { createSession } from "../../../lib/auth/session";

function redirectToLogin(error: string) {
    return new Response(null, {
        status: 303,
        headers: {
            Location: `/login?error=${encodeURIComponent(error)}`,
        },
    });
}

export const POST: APIRoute = async (context) => {
    try {
        const formData = await context.request.formData();

        const email = String(formData.get("email") || "").trim().toLowerCase();
        const password = String(formData.get("password") || "").trim();

        if (!email || !password) {
            return redirectToLogin("missing_fields");
        }

        const users = await sql`
      SELECT id, name, email, password_hash, role
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

        const user = users[0];

        if (!user) {
            return redirectToLogin("invalid_credentials");
        }

        const isValid = await verifyPassword(password, user.password_hash);

        if (!isValid) {
            return redirectToLogin("invalid_credentials");
        }

        const session = await createSession(user.id);

        context.cookies.set("session", session.token, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: import.meta.env.PROD,
            expires: session.expiresAt,
        });

        return new Response(null, {
            status: 303,
            headers: {
                Location: "/dashboard",
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return redirectToLogin("server_error");
    }
};