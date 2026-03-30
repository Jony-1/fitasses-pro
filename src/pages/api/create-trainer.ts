import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";
import { hashPassword } from "../../lib/auth/password";

export const GET: APIRoute = async (context) => {
    try {
        if (!context.locals.user) {
            return new Response(JSON.stringify({ error: "Debes iniciar sesion" }), { status: 401 });
        }

        if (context.locals.user.role !== "admin") {
            return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
        }

        const passwordHash = await hashPassword("admin");

        await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Admin', 'admin@gmail.com', ${passwordHash}, 'admin')
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `;

        return new Response(
            JSON.stringify({
                status: "trainer created",
                email: "admin@gmail.com",
                password: "admin",
            }),
            { status: 200 }
        );
    } catch (error) {
        console.error("create trainer error:", error);

        return new Response(
            JSON.stringify({
                status: "error",
            }),
            { status: 500 }
        );
    }
};
