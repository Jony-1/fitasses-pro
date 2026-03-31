import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { requireTrainer } from "../../../lib/auth/guards";
import { getClientByIdForUser } from "../../../lib/utils/client-profile";

export const POST: APIRoute = async (context) => {
    try {
        const user = requireTrainer(context);

        const formData = await context.request.formData();
        const assessmentId = Number(formData.get("assessment_id"));
        const clientId = Number(formData.get("client_id"));

        if (!assessmentId || !clientId) {
            return new Response(null, {
                status: 303,
                headers: {
                    Location: `/clients/${clientId}/assessments?error=invalid_request`,
                },
            });
        }

        const client = await getClientByIdForUser(clientId, user);

        if (!client) {
            return new Response(null, {
                status: 303,
                headers: {
                    Location: `/clients/${clientId}/assessments?error=forbidden`,
                },
            });
        }

        await sql`
      DELETE FROM assessments
      WHERE id = ${assessmentId}
      AND client_id = ${clientId}
    `;

        return new Response(null, {
            status: 303,
            headers: {
                Location: `/clients/${clientId}/assessments?success=assessment_deleted`,
            },
        });
    } catch (error) {
        console.error("Error deleting assessment:", error);

        return new Response(null, {
            status: 303,
            headers: {
                Location: `/dashboard?error=forbidden`,
            },
        });
    }
};
