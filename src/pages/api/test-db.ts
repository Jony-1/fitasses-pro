import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";

export const GET: APIRoute = async () => {

    const result = await sql`SELECT NOW()`;

    return new Response(
        JSON.stringify({
            database_time: result[0].now
        }),
        { status: 200 }
    );
};