import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";
import { hashPassword } from "../../lib/auth/password";

export const GET: APIRoute = async () => {
    try {
        const passwordHash = await hashPassword("root");

        await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES ('Trainer', 'trainer@gmail.com', ${passwordHash}, 'trainer')
      ON CONFLICT (email)
      DO UPDATE SET
        name = EXCLUDED.name,
        password_hash = EXCLUDED.password_hash,
        role = EXCLUDED.role
    `;

        return new Response(
            JSON.stringify({
                status: "trainer created",
                email: "trainer@gmail.com",
                password: "root",
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