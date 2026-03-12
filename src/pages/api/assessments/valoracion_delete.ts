import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { requireTrainer } from "../../../lib/auth/guards";

export const POST: APIRoute = async ( context ) => {
    try {
        requireTrainer(context);
        const formData = await context.request.formData();

        const assessmentId = Number(formData.get("assessment_id"));
        const clientId = Number(formData.get("client_id"));

        if (!assessmentId || Number.isNaN(assessmentId)) {
            return new Response("Valoración inválida", { status: 400 });
        }

        await sql`
      DELETE FROM assessment_measurements
      WHERE assessment_id = ${assessmentId}
    `;

        await sql`
      DELETE FROM assessments
      WHERE id = ${assessmentId}
    `;

        return new Response(null, {
            status: 303,
            headers: {
                Location: `/clients/${clientId}/assessments`,
            },
        });
    } catch (error) {
        console.error("Error eliminando valoración:", error);

        return new Response("No se pudo eliminar la valoración", {
            status: 500,
        });
    }
};