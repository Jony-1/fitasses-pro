import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";

export const GET: APIRoute = async (context) => {
    if (!context.locals.user) {
        return new Response(JSON.stringify({ error: "Debes iniciar sesion" }), { status: 401 });
    }

    if (context.locals.user.role !== "admin") {
        return new Response(JSON.stringify({ error: "No autorizado" }), { status: 403 });
    }

    const result = await sql`SELECT NOW()`;

    return new Response(
        JSON.stringify({
            database_time: result[0].now
        }),
        { status: 200 }
    );
};
