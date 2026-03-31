import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { requireTrainer } from "../../../lib/auth/guards";

export const GET: APIRoute = async (context) => {
  try {
    const user = requireTrainer(context);

    const clients = user.role === "admin"
      ? await sql`
          SELECT id, full_name, birth_date, height_m, gender, user_id
          FROM clients
          ORDER BY id DESC
        `
      : user.role === "gym_manager"
      ? await sql`
          SELECT c.id, c.full_name, c.birth_date, c.height_m, c.gender, c.user_id
          FROM clients c
          INNER JOIN users u ON u.id = c.trainer_id
          WHERE u.gym_id = ${user.gymId}
          ORDER BY c.id DESC
        `
      : await sql`
          SELECT id, full_name, birth_date, height_m, gender, user_id
          FROM clients
          WHERE trainer_id = ${user.id}
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
  } catch (error) {
    if (error instanceof Error && (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 403,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "No se pudo listar clientes" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
