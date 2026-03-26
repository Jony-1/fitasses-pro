import type { APIRoute } from "astro";
import crypto from "node:crypto";
import { requireAdmin } from "../../../../lib/auth/guards";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        requireAdmin(context);

        const formData = await context.request.formData();
        const name = String(formData.get("name") || "").trim();

        if (!name) {
            return context.redirect("/admin/gyms?status=error&message=El%20nombre%20es%20obligatorio");
        }

        const exists = await sql`
            SELECT id
            FROM gyms
            WHERE lower(name) = lower(${name})
            LIMIT 1
        `;

        if (exists.length > 0) {
            return context.redirect("/admin/gyms?status=error&message=Ya%20existe%20un%20gimnasio%20con%20ese%20nombre");
        }

        const inviteCode = crypto.randomBytes(4).toString("hex");

        await sql`
            INSERT INTO gyms (name, invite_code)
            VALUES (${name}, ${inviteCode})
        `;

        return context.redirect(`/admin/gyms?status=success&message=${encodeURIComponent(`Gimnasio creado correctamente. Código: ${inviteCode}`)}`);
    } catch (error) {
        console.error("Create gym error:", error);
        return context.redirect("/admin/gyms?status=error&message=No%20se%20pudo%20crear%20el%20gimnasio");
    }
};
