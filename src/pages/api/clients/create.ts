import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

export const POST: APIRoute = async ({ request }) => {
    try {
        const formData = await request.formData();

        const fullName = String(formData.get("full_name") || "").trim();
        const birthDate = String(formData.get("birth_date") || "").trim();
        const heightM = String(formData.get("height_m") || "").trim();
        const notes = String(formData.get("notes") || "").trim();
        const gender = String(formData.get("gender") || "").trim();

        if (!fullName) {
            return new Response("El nombre es obligatorio", { status: 400 });
        }

        await sql`
      INSERT INTO clients (full_name, birth_date, height_m, notes, gender)
      VALUES (
        ${fullName},
        ${birthDate || null},
        ${heightM ? Number(heightM) : null},
        ${notes || null},
        ${gender  || null}
      )
    `;

        return new Response(null, {
            status: 303,
            headers: {
                Location: "/clients",
            },
        });
    } catch (error) {
        console.error("Error creating client:", error);
        return new Response("Error al crear cliente", { status: 500 });
    }
};