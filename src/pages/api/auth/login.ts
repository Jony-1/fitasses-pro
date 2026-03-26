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

        let redirectTo = "/dashboard";

        if (String(user.role) === "gym_manager") {
            redirectTo = "/gym-manager";
        } else if (String(user.role) === "client") {
            const clientRows = await sql`
                SELECT id
                FROM clients
                WHERE user_id = ${user.id}
                LIMIT 1
            `;

            if (clientRows[0]?.id) {
                redirectTo = `/clients/${clientRows[0].id}/routine`;
            } else {
                redirectTo = "/client-home";
            }
        }

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
                Location: redirectTo,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        return redirectToLogin("server_error");
    }
};
