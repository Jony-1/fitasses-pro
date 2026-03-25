import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    const { request, redirect, locals } = context;

    const user = locals.user;

    if (!user) {
        return redirect("/login");
    }

    if (user.role !== "trainer" && user.role !== "admin") {
        return redirect("/login?error=forbidden");
    }

    const formData = await request.formData();

    const fullName = String(formData.get("full_name") ?? "").trim();
    const birthDate = String(formData.get("birth_date") ?? "").trim() || null;
    const gender = String(formData.get("gender") ?? "").trim() || null;
    const heightRaw = String(formData.get("height_m") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim() || null;

    if (!fullName) {
        return redirect("/clients/new?error=missing_name");
    }

    const height =
        heightRaw === "" ? null : Number(heightRaw);

    if (heightRaw !== "" && Number.isNaN(height!)) {
        return redirect("/clients/new?error=invalid_height");
    }

    let trainerId: number;

    // 🔥 CLAVE
    if (user.role === "trainer") {
        trainerId = user.id;
    } else {
        const trainerIdRaw = String(formData.get("trainer_id") ?? "").trim();

        if (!trainerIdRaw) {
            return redirect("/clients/new?error=missing_trainer");
        }

        trainerId = Number(trainerIdRaw);

        if (Number.isNaN(trainerId)) {
            return redirect("/clients/new?error=invalid_trainer");
        }
    }

    await sql`
        INSERT INTO clients (
            trainer_id,
            full_name,
            birth_date,
            height_m,
            notes,
            gender
        )
        VALUES (
            ${trainerId},
            ${fullName},
            ${birthDate},
            ${height},
            ${notes},
            ${gender}
        )
    `;

    return redirect("/clients");
};