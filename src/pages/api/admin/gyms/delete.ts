import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth/guards";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        requireAdmin(context);

        const formData = await context.request.formData();
        const id = Number(formData.get("id"));

        if (!id || Number.isNaN(id)) {
            return context.redirect("/admin/gyms?status=error&message=Gimnasio%20inválido");
        }

        const trainerRows = await sql`
            SELECT COUNT(*)::int AS total
            FROM users
            WHERE gym_id = ${id}
              AND role = 'trainer'
        `;

        if ((trainerRows[0]?.total ?? 0) > 0) {
            return context.redirect(`/admin/gyms/${id}/edit?status=error&message=No%20puedes%20eliminar%20un%20gimnasio%20con%20trainers%20asignados`);
        }

        await sql`
            UPDATE users
            SET gym_id = NULL
            WHERE gym_id = ${id}
              AND role = 'gym_manager'
        `;

        await sql`
            DELETE FROM gyms
            WHERE id = ${id}
        `;

        return context.redirect("/admin/gyms?status=success&message=Gimnasio%20eliminado");
    } catch (error) {
        console.error("Delete gym error:", error);
        return context.redirect("/admin/gyms?status=error&message=No%20se%20pudo%20eliminar%20el%20gimnasio");
    }
};
