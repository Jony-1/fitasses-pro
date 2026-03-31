import type { APIRoute } from "astro";
import { requireAdminOrGymManager } from "../../../../lib/auth/guards";
import { hashPassword } from "../../../../lib/auth/password";
import { sql } from "../../../../lib/db/client";
import { getTeamEditHref, getTeamListHref } from "../../../../lib/utils/team-routes";
import { isStrongPassword } from "../../../../lib/utils/validation";

export const POST: APIRoute = async (context) => {
    try {
        const user = requireAdminOrGymManager(context);
        const teamListHref = getTeamListHref(user.role);

        const formData = await context.request.formData();

        const id = Number(formData.get("id"));
        const password = String(formData.get("password") || "").trim();

        if (!id || Number.isNaN(id) || !password) {
            return context.redirect(
                `${getTeamEditHref(user.role, id)}?status=error&message=Datos%20inválidos`,
            );
        }

        if (!isStrongPassword(password)) {
            return context.redirect(
                `${getTeamEditHref(user.role, id)}?status=error&message=La%20contraseña%20debe%20tener%20al%20menos%204%20caracteres,%20una%20mayúscula%20y%20un%20número`,
            );
        }

        const trainerRows =
            user.role === "admin"
                ? await sql`
                      SELECT id
                      FROM users
                      WHERE id = ${id}
                        AND role IN ('trainer', 'gym_manager')
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
                `${teamListHref}?status=error&message=Cuenta%20no%20encontrada`,
            );
        }

        const passwordHash = await hashPassword(password);

        await sql`
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id = ${id}
        AND role IN ('trainer', 'gym_manager')
        ${user.role === "gym_manager" ? sql`AND gym_id = ${user.gymId}` : sql``}
    `;

        return context.redirect(
            `${getTeamEditHref(user.role, id)}?status=success&message=Contraseña%20restablecida%20correctamente`,
        );
    } catch (error) {
        console.error("Reset trainer password error:", error);

        const fallbackId = Number((await context.request.formData()).get("id"));

        return context.redirect(
            `/admin/trainers/${fallbackId}/edit?status=error&message=No%20se%20pudo%20restablecer%20la%20contraseña`,
        );
    }
};
