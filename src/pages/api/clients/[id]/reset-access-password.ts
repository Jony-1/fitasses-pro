import type { APIRoute } from "astro";
import { sql } from "../../../../lib/db/client";
import { requireTrainer } from "../../../../lib/auth/guards";
import { hashPassword } from "../../../../lib/auth/password";
import { isStrongPassword } from "../../../../lib/utils/validation";

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
        const password = String(formData.get("password") || "").trim();

        if (!password) {
            return redirectToEdit(clientId, "error", "La nueva contraseña es obligatoria.");
        }

        if (!isStrongPassword(password)) {
            return redirectToEdit(
                clientId,
                "error",
                "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.",
            );
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

        const passwordHash = await hashPassword(password);

        await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${client.user_id}
    `;

        return redirectToEdit(clientId, "success", "Contraseña restablecida correctamente.");
    } catch (error) {
        console.error("Error restableciendo contraseña:", error);

        if (
            error instanceof Error &&
            (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ) {
            return new Response("No autorizado", { status: 403 });
        }

        return redirectToEdit(clientId, "error", "Ocurrió un error interno al restablecer la contraseña.");
    }
};
