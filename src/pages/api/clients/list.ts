import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

export const GET: APIRoute = async () => {

  const clients = await sql`
    SELECT id, full_name, birth_date, height_m, gender
    FROM clients
    ORDER BY id DESC
  `;

  return new Response(
    JSON.stringify(clients),
    {
      status: 200,
      headers: {
        "content-type": "application/json"
      }
    }
  );
};