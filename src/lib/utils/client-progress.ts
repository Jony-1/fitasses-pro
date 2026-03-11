import { sql } from "../db/client";
import { calculateChange } from "./client";

export async function getClientProgressSummary(clientId: number) {

    
    const latestAssessmentRows = await sql`
    SELECT
      assessment_date,
      weight_kg,
      body_fat_pct,
      muscle_pct,
      bmi
    FROM assessments
    WHERE client_id = ${clientId}
    ORDER BY assessment_date DESC, id DESC
    LIMIT 1
  `;

    const latestAssessment = latestAssessmentRows[0] ?? null;

    const firstAssessmentRows = await sql`
    SELECT
      assessment_date,
      weight_kg,
      body_fat_pct,
      muscle_pct,
      bmi
    FROM assessments
    WHERE client_id = ${clientId}
    ORDER BY assessment_date ASC, id ASC
    LIMIT 1
  `;

    const firstAssessment = firstAssessmentRows[0] ?? null;

    const totalAssessmentsRows = await sql`
    SELECT COUNT(*)::int AS total
    FROM assessments
    WHERE client_id = ${clientId}
  `;

    const totalAssessments = totalAssessmentsRows[0]?.total ?? 0;

    return {
        latestAssessment,
        firstAssessment,
        totalAssessments,
        weightChange: calculateChange(
            latestAssessment?.weight_kg,
            firstAssessment?.weight_kg
        ),
        bodyFatChange: calculateChange(
            latestAssessment?.body_fat_pct,
            firstAssessment?.body_fat_pct
        ),
        muscleChange: calculateChange(
            latestAssessment?.muscle_pct,
            firstAssessment?.muscle_pct
        ),
    };
}