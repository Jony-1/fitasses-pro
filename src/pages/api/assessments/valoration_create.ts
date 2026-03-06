import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";

function json(data: unknown, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
        },
    });
}

function normalizeDecimal(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    const normalized = String(value).trim().replace(",", ".");
    const parsed = Number(normalized);

    if (Number.isNaN(parsed)) return NaN;

    return parsed;
}

function normalizeInteger(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    const normalized = String(value).trim();
    if (!/^\d+$/.test(normalized)) return NaN;

    const parsed = Number(normalized);

    if (!Number.isInteger(parsed)) return NaN;

    return parsed;
}

function validateDecimalField(
    value: number | null,
    label: string,
    { required = false, min = 0, max = 999.99 }: { required?: boolean; min?: number; max?: number } = {}
) {
    if (value === null) {
        if (required) {
            return `${label} es obligatorio`;
        }
        return null;
    }

    if (Number.isNaN(value)) {
        return `${label} debe ser un número válido`;
    }

    if (value < min) {
        return `${label} no puede ser menor que ${min}`;
    }

    if (value > max) {
        return `${label} no puede ser mayor que ${max}`;
    }

    return null;
}

function validateIntegerField(
    value: number | null,
    label: string,
    { required = false, min = 0, max = 99999 }: { required?: boolean; min?: number; max?: number } = {}
) {
    if (value === null) {
        if (required) {
            return `${label} es obligatorio`;
        }
        return null;
    }

    if (Number.isNaN(value)) {
        return `${label} debe ser un entero válido`;
    }

    if (value < min) {
        return `${label} no puede ser menor que ${min}`;
    }

    if (value > max) {
        return `${label} no puede ser mayor que ${max}`;
    }

    return null;
}

export const POST: APIRoute = async ({ request }) => {
    try {
        const body = await request.json();

        const client_id = Number(body.client_id);
        const assessment_date =
            typeof body.assessment_date === "string" ? body.assessment_date.trim() : "";
        const notes = typeof body.notes === "string" ? body.notes.trim() : null;

        const weight_kg = normalizeDecimal(body.weight_kg);
        const body_fat_pct = normalizeDecimal(body.body_fat_pct);
        const muscle_pct = normalizeDecimal(body.muscle_pct);

        const daily_calories = normalizeInteger(body.daily_calories);
        const metabolic_age = normalizeInteger(body.metabolic_age);
        const visceral_fat = normalizeInteger(body.visceral_fat);

        const shoulders_cm = normalizeDecimal(body.shoulders_cm);
        const chest_cm = normalizeDecimal(body.chest_cm);
        const right_arm_cm = normalizeDecimal(body.right_arm_cm);
        const waist_cm = normalizeDecimal(body.waist_cm);
        const hips_cm = normalizeDecimal(body.hips_cm);
        const right_thigh_cm = normalizeDecimal(body.right_thigh_cm);
        const calf_cm = normalizeDecimal(body.calf_cm);

        if (!Number.isInteger(client_id) || client_id <= 0) {
            return json({ error: "Cliente inválido" }, 400);
        }

        if (!assessment_date) {
            return json({ error: "La fecha de valoración es obligatoria" }, 400);
        }

        const errors = [
            validateDecimalField(weight_kg, "Peso", { required: true, max: 999.99 }),
            validateDecimalField(body_fat_pct, "Grasa corporal", { max: 100 }),
            validateDecimalField(muscle_pct, "Masa muscular", { max: 100 }),

            validateIntegerField(daily_calories, "Calorías diarias", { max: 99999 }),
            validateIntegerField(metabolic_age, "Edad metabólica", { max: 150 }),
            validateIntegerField(visceral_fat, "Grasa visceral", { max: 100 }),

            validateDecimalField(shoulders_cm, "Hombros", { max: 999.99 }),
            validateDecimalField(chest_cm, "Pecho", { max: 999.99 }),
            validateDecimalField(right_arm_cm, "Brazo derecho", { max: 999.99 }),
            validateDecimalField(waist_cm, "Cintura", { max: 999.99 }),
            validateDecimalField(hips_cm, "Cadera", { max: 999.99 }),
            validateDecimalField(right_thigh_cm, "Muslo derecho", { max: 999.99 }),
            validateDecimalField(calf_cm, "Pantorrilla", { max: 999.99 }),
        ].filter(Boolean);

        if (errors.length > 0) {
            return json({ error: errors[0] }, 400);
        }

        const clientRows = await sql`
      SELECT id, height_m
      FROM clients
      WHERE id = ${client_id}
      LIMIT 1
    `;

        const client = clientRows[0];

        if (!client) {
            return json({ error: "El cliente no existe" }, 404);
        }

        let bmi: number | null = null;

        if (client.height_m && weight_kg) {
            const height = Number(client.height_m);

            if (!Number.isNaN(height) && height > 0) {
                bmi = Number((weight_kg / (height * height)).toFixed(2));
            }
        }

        const assessmentRows = await sql`
      INSERT INTO assessments (
        client_id,
        assessment_date,
        weight_kg,
        body_fat_pct,
        muscle_pct,
        daily_calories,
        metabolic_age,
        visceral_fat,
        bmi,
        notes,
        created_by
      )
      VALUES (
        ${client_id},
        ${assessment_date},
        ${weight_kg},
        ${body_fat_pct},
        ${muscle_pct},
        ${daily_calories},
        ${metabolic_age},
        ${visceral_fat},
        ${bmi},
        ${notes || null},
        ${null}
      )
      RETURNING id, client_id, assessment_date, weight_kg, bmi
    `;

        const assessment = assessmentRows[0];

        await sql`
      INSERT INTO assessment_measurements (
        assessment_id,
        shoulders_cm,
        chest_cm,
        right_arm_cm,
        waist_cm,
        hips_cm,
        right_thigh_cm,
        calf_cm
      )
      VALUES (
        ${assessment.id},
        ${shoulders_cm},
        ${chest_cm},
        ${right_arm_cm},
        ${waist_cm},
        ${hips_cm},
        ${right_thigh_cm},
        ${calf_cm}
      )
    `;

        return json(
            {
                message: "Valoración creada correctamente",
                assessment,
            },
            201
        );
    } catch (error) {
        console.error("Error creando valoración:", error);
        return json({ error: "Error al crear la valoración" }, 500);
    }
};