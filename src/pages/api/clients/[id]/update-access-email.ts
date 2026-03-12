import type { APIRoute } from "astro";
import { sql } from "../../../../lib/db/client";
import { requireTrainer } from "../../../../lib/auth/guards";

function parseId(id: string | undefined) {
    if (!id) return null;

    const parsed = Number(id);

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }

    return parsed;
}

function redirectToEdit(clientId: number, status: string, message: string) {
    const location = `/clients/${clientId}/edit?access_status=${encodeURIComponent(status)}&access_message=${encodeURIComponent(message)}`;

    return new Response(null, {
        status: 303,
        headers: {
            Location: location,
        },
    });
}

export const POST: APIRoute = async (context) => {
    const clientId = parseId(context.params.id);

    if (!clientId) {
        return new Response("ID de cliente inválido", { status: 400 });
    }

    try {
        requireTrainer(context);

        const formData = await context.request.formData();
        const email = String(formData.get("email") || "").trim().toLowerCase();

        if (!email) {
            return redirectToEdit(clientId, "error", "El correo es obligatorio.");
        }

        const clientResult = await sql`
      SELECT id, user_id
      FROM clients
      WHERE id = ${clientId}
      LIMIT 1
    `;

        const client = clientResult[0];

        if (!client) {
            return redirectToEdit(clientId, "error", "Cliente no encontrado.");
        }

        if (!client.user_id) {
            return redirectToEdit(clientId, "error", "Este cliente no tiene acceso creado.");
        }

        const existingUser = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
        AND id <> ${client.user_id}
      LIMIT 1
    `;

        if (existingUser[0]) {
            return redirectToEdit(clientId, "error", "Ya existe otro usuario con ese correo.");
        }

        await sql`
      UPDATE users
      SET email = ${email}
      WHERE id = ${client.user_id}
    `;

        return redirectToEdit(clientId, "success", "Correo actualizado correctamente.");
    } catch (error) {
        console.error("Error actualizando correo de acceso:", error);

        if (
            error instanceof Error &&
            (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ) {
            return new Response("No autorizado", { status: 403 });
        }

        return redirectToEdit(clientId, "error", "Ocurrió un error interno al actualizar el correo.");
    }
};