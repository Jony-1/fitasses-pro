import type { APIRoute } from "astro";
import { requireAdminOrGymManager } from "../../../../lib/auth/guards";
import { hashPassword } from "../../../../lib/auth/password";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        const user = requireAdminOrGymManager(context);

        const formData = await context.request.formData();

        const id = Number(formData.get("id"));
        const password = String(formData.get("password") || "").trim();

        if (!id || Number.isNaN(id) || !password) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=Datos%20inválidos`,
            );
        }

        if (password.length < 6) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=La%20Fcontraseña%20debe%20tener%20mínimo%206%20caracteres`,
            );
        }

        const trainerRows =
            user.role === "admin"
                ? await sql`
                      SELECT id
                      FROM users
                      WHERE id = ${id}
                        AND role = 'trainer'
                      LIMIT 1
                  `
                : await sql`
                      SELECT id
                      FROM users
                      WHERE id = ${id}
                        AND role = 'trainer'
                        AND gym_id = ${user.gymId}
                      LIMIT 1
                  `;

        if (trainerRows.length === 0) {
            return context.redirect(
                `/admin/trainers?status=error&message=Trainer%20no%20encontrado`,
            );
        }

        const passwordHash = await hashPassword(password);

        await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${id}
        AND role = 'trainer'
        ${user.role === "gym_manager" ? sql`AND gym_id = ${user.gymId}` : sql``}
    `;

        return context.redirect(
            `/admin/trainers/${id}/edit?status=success&message=Contraseña%20restablecida%20correctamente`,
        );
    } catch (error) {
        console.error("Reset trainer password error:", error);

        const fallbackId = Number((await context.request.formData()).get("id"));

        return context.redirect(
            `/admin/trainers/${fallbackId}/edit?status=error&message=No%20se%20pudo%20restablecer%20la%20contraseña`,
        );
    }
};
