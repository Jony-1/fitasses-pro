import type { APIRoute } from "astro";
import { requireAdminOrGymManager } from "../../../../lib/auth/guards";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        const user = requireAdminOrGymManager(context);

        const formData = await context.request.formData();

        const id = Number(formData.get("id"));
        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();
        const roleRaw = String(formData.get("role") || "trainer").trim();
        const gymIdRaw = String(formData.get("gym_id") || "").trim();
        const role = roleRaw === "gym_manager" ? "gym_manager" : "trainer";

        if (!id || Number.isNaN(id) || !name || !email) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=Datos%20inválidos`,
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

        const gymId =
            user.role === "admin" ? Number(gymIdRaw) : user.gymId ?? null;

        if (user.role === "admin" && (!gymId || Number.isNaN(gymId))) {
            return context.redirect(
                `/admin/trainers/${id}/edit?status=error&message=Selecciona%20un%20gimnasio%20válido`,
            );
        }

        await sql`
      UPDATE users
      SET name = ${name},
          email = ${email},
          role = ${user.role === "admin" ? role : "trainer"},
          gym_id = ${gymId}
      WHERE id = ${id}
        AND role IN ('trainer', 'gym_manager')
        ${user.role === "gym_manager" ? sql`AND gym_id = ${user.gymId}` : sql``}
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
