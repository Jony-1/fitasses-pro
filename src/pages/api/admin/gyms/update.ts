import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth/guards";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        requireAdmin(context);

        const formData = await context.request.formData();
        const id = Number(formData.get("id"));
        const name = String(formData.get("name") || "").trim();

        if (!id || Number.isNaN(id) || !name) {
            return context.redirect("/admin/gyms?status=error&message=Datos%20inválidos");
        }

        await sql`
            UPDATE gyms
            SET name = ${name}
            WHERE id = ${id}
        `;

        return context.redirect(`/admin/gyms/${id}/edit?status=success&message=Gimnasio%20actualizado`);
    } catch (error) {
        console.error("Update gym error:", error);
        return context.redirect("/admin/gyms?status=error&message=No%20se%20pudo%20actualizar%20el%20gimnasio");
    }
};
