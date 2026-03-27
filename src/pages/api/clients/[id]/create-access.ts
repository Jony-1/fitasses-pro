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

        const email = String(formData.get("email") || "").trim().toLowerCase();
        const password = String(formData.get("password") || "").trim();

        if (!email || !password) {
            return redirectToEdit(clientId, "error", "Correo y contraseña son obligatorios.");
        }

        if (!isStrongPassword(password)) {
            return redirectToEdit(
                clientId,
                "error",
                "La contraseña debe tener al menos 8 caracteres, una mayúscula y un número.",
            );
        }

        const clientResult = await sql`
      SELECT id, full_name, user_id
      FROM clients
      WHERE id = ${clientId}
      LIMIT 1
    `;

        const client = clientResult[0];

        if (!client) {
            return redirectToEdit(clientId, "error", "Cliente no encontrado.");
        }

        if (client.user_id) {
            return redirectToEdit(clientId, "error", "Este cliente ya tiene acceso asignado.");
        }

        const existingUser = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

        if (existingUser[0]) {
            return redirectToEdit(clientId, "error", "Ya existe un usuario con ese correo.");
        }

        const passwordHash = await hashPassword(password);

        const createdUsers = await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${client.full_name}, ${email}, ${passwordHash}, 'client')
      RETURNING id
    `;

        const newUser = createdUsers[0];

        await sql`
      UPDATE clients
      SET user_id = ${newUser.id}
      WHERE id = ${clientId}
    `;

        return redirectToEdit(clientId, "success", "Acceso creado correctamente.");
    } catch (error) {
        console.error("Error creando acceso para cliente:", error);

        if (
            error instanceof Error &&
            (error.message === "UNAUTHORIZED" || error.message === "FORBIDDEN")
        ) {
            return new Response("No autorizado", { status: 403 });
        }

        return redirectToEdit(clientId, "error", "Ocurrió un error interno al crear el acceso.");
    }
};
