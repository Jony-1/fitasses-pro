import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

function parseId(id: string | undefined) {
    if (!id) return null;

    const parsed = Number(id);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

export const GET: APIRoute = async ({ params }) => {
    const id = parseId(params.id);

    if (!id) {
        return json({ error: "ID de cliente inválido" }, 400);
    }

    try {
        const result = await sql`
      SELECT id, full_name, birth_date, height_m, notes, created_at
      FROM clients
      WHERE id = ${id}
      LIMIT 1
    `;

        const client = result[0];

        if (!client) {
            return json({ error: "Cliente no encontrado" }, 404);
        }

        return json(client, 200);
    } catch (error) {
        console.error("Error obteniendo cliente:", error);
        return json({ error: "Error al obtener cliente" }, 500);
    }
};

export const PUT: APIRoute = async ({ params, request }) => {
    const id = parseId(params.id);

    if (!id) {
        return json({ error: "ID de cliente inválido" }, 400);
    }

    try {
        const body = await request.json();

        const full_name =
            typeof body.full_name === "string" ? body.full_name.trim() : "";
        const birth_date =
            typeof body.birth_date === "string" ? body.birth_date.trim() : null;
        const notes =
            typeof body.notes === "string" ? body.notes.trim() : null;

        let height_m: number | null = null;

        if (body.height_m !== undefined && body.height_m !== null && body.height_m !== "") {
            const parsedHeight = Number(body.height_m);

            if (Number.isNaN(parsedHeight)) {
                return json({ error: "La altura debe ser un número válido" }, 400);
            }

            if (parsedHeight < 0.5 || parsedHeight > 2.5) {
                return json({ error: "La altura debe estar entre 0.5 y 2.5 metros" }, 400);
            }

            height_m = parsedHeight;
        }

        if (!full_name) {
            return json({ error: "El nombre es obligatorio" }, 400);
        }

        const result = await sql`
      UPDATE clients
      SET
        full_name = ${full_name},
        birth_date = ${birth_date || null},
        height_m = ${height_m},
        notes = ${notes || null}
      WHERE id = ${id}
      RETURNING id, full_name, birth_date, height_m, notes, created_at
    `;

        const updatedClient = result[0];

        if (!updatedClient) {
            return json({ error: "Cliente no encontrado" }, 404);
        }

        return json(
            {
                message: "Cliente actualizado correctamente",
                client: updatedClient,
            },
            200
        );
    } catch (error) {
        console.error("Error actualizando cliente:", error);
        return json({ error: "Error al actualizar cliente" }, 500);
    }
};


export const DELETE: APIRoute = async ({ params }) => {
    const id = parseId(params.id);

    if (!id) {
        return json({ error: "ID de cliente inválido" }, 400);
    }

    try {
        const result = await sql`
      DELETE FROM clients
      WHERE id = ${id}
      RETURNING id
    `;

        const deleted = result[0];

        if (!deleted) {
            return json({ error: "Cliente no encontrado" }, 404);
        }

        return json({
            message: "Cliente eliminado correctamente",
            id: deleted.id
        });
    } catch (error) {
        console.error("Error eliminando cliente:", error);

        return json(
            { error: "No se pudo eliminar el cliente" },
            500
        );
    }
};