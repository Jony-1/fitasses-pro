import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { requireTrainer } from "../../../lib/auth/guards";
import { getClientByIdForUser } from "../../../lib/utils/client-profile";

function toNumber(value: unknown) {
    if (value === null || value === undefined || value === "") return null;

    const num = Number(value);
    return Number.isNaN(num) ? null : num;
}

export const POST: APIRoute = async ( context ) => {
    try {
        const user = requireTrainer(context);
        const body = await context.request.json();

        const assessmentId = Number(body.assessment_id);
        const clientId = Number(body.client_id);

        if (!assessmentId || Number.isNaN(assessmentId)) {
            return new Response(
                JSON.stringify({ error: "Valoración inválida" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        if (!clientId || Number.isNaN(clientId)) {
            return new Response(
                JSON.stringify({ error: "Cliente inválido" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        const assessmentDate = String(body.assessment_date || "").trim();
        const weightKg = toNumber(body.weight_kg);
        const bodyFatPct = toNumber(body.body_fat_pct);
        const musclePct = toNumber(body.muscle_pct);
        const dailyCalories = toNumber(body.daily_calories);
        const metabolicAge = toNumber(body.metabolic_age);
        const visceralFat = toNumber(body.visceral_fat);
        const notes = String(body.notes || "").trim();

        const shouldersCm = toNumber(body.shoulders_cm);
        const chestCm = toNumber(body.chest_cm);
        const rightArmCm = toNumber(body.right_arm_cm);
        const waistCm = toNumber(body.waist_cm);
        const hipsCm = toNumber(body.hips_cm);
        const rightThighCm = toNumber(body.right_thigh_cm);
        const calfCm = toNumber(body.calf_cm);

        const client = await getClientByIdForUser(clientId, user) as { id: number; height_m: number | null } | null;

        if (!client) {
            return new Response(JSON.stringify({ error: "No tienes acceso a este cliente" }), {
                status: 403,
                headers: { "Content-Type": "application/json" },
            });
        }

        let bmi: number | null = null;

        if (client.height_m && weightKg) {
            const height = Number(client.height_m);

            if (!Number.isNaN(height) && height > 0) {
                bmi = Number((weightKg / (height * height)).toFixed(2));
            }
        }

        await sql.begin(async (tx) => {
            const transaction = tx as unknown as typeof sql;

            await transaction`
        UPDATE assessments
        SET
          assessment_date = ${assessmentDate || null},
          weight_kg = ${weightKg},
          body_fat_pct = ${bodyFatPct},
          muscle_pct = ${musclePct},
          daily_calories = ${dailyCalories},
          metabolic_age = ${metabolicAge},
          visceral_fat = ${visceralFat},
          bmi = ${bmi},
          notes = ${notes || null}
        WHERE id = ${assessmentId}
          AND client_id = ${clientId}
      `;

            const existingMeasurement = await transaction`
        SELECT assessment_id
        FROM assessment_measurements
        WHERE assessment_id = ${assessmentId}
        LIMIT 1
      `;

            if (existingMeasurement.length > 0) {
                await transaction`
          UPDATE assessment_measurements
          SET
            shoulders_cm = ${shouldersCm},
            chest_cm = ${chestCm},
            right_arm_cm = ${rightArmCm},
            waist_cm = ${waistCm},
            hips_cm = ${hipsCm},
            right_thigh_cm = ${rightThighCm},
            calf_cm = ${calfCm}
          WHERE assessment_id = ${assessmentId}
        `;
            } else {
                await transaction`
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
            ${assessmentId},
            ${shouldersCm},
            ${chestCm},
            ${rightArmCm},
            ${waistCm},
            ${hipsCm},
            ${rightThighCm},
            ${calfCm}
          )
        `;
            }
        });

        return new Response(
            JSON.stringify({
                success: true,
                message: "Valoración actualizada correctamente",
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    } catch (error) {
        console.error("Error actualizando valoración:", error);

        return new Response(
            JSON.stringify({
                success: false,
                error: "No se pudo actualizar la valoración",
            }),
            {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                },
            }
        );
    }
};
