import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth/guards";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        requireAdmin(context);

        const formData = await context.request.formData();

        const id = Number(formData.get("id"));
        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();

        if (!id || Number.isNaN(id) || !name || !email) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=Datos%20inválidos`,
            );
        }

        const trainerRows = await sql`
      SELECT id
      FROM users
      WHERE id = ${id}
        AND role = 'trainer'
      LIMIT 1
    `;

        if (trainerRows.length === 0) {
            return context.redirect(
                `/admin/trainers?status=error&message=Trainer%20no%20encontrado`,
            );
        }

        const emailInUse = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
        AND id <> ${id}
      LIMIT 1
    `;

        if (emailInUse.length > 0) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=Ese%20correo%20ya%20está%20en%20uso`,
            );
        }

        await sql`
      UPDATE users
      SET name = ${name},
          email = ${email}
      WHERE id = ${id}
        AND role = 'trainer'
    `;

        return context.redirect(
            `/admin/trainers/${id}/edit?status=success&message=Datos%20actualizados%20correctamente`,
        );
    } catch (error) {
        console.error("Update trainer error:", error);

        const fallbackId = Number((await context.request.formData()).get("id"));

        return context.redirect(
            `/admin/trainers/${fallbackId}/edit?status=error&message=No%20se%20pudo%20actualizar%20el%20trainer`,
        );
    }
};