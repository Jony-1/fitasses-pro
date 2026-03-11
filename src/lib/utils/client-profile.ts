import { sql } from "../db/client";

export type Client = {
    id: number;
    full_name: string;
    birth_date: string | Date | null;
    height_m: number | null;
    notes: string | null;
    gender: string | null;
    created_at: string | Date | null;
};

export type ProgressHistoryItem = {
    assessment_date: string | Date | null;
    weight_kg: number | null;
    body_fat_pct: number | null;
    muscle_pct: number | null;
    bmi: number | null;
};

export async function getClientById(id: number): Promise<Client | null> {
    const result = await sql`
    SELECT id, full_name, birth_date, height_m, notes, gender, created_at
    FROM clients
    WHERE id = ${id}
    LIMIT 1
  `;

    return (result[0] as Client) ?? null;
}

export async function getProgressHistory(
    id: number,
): Promise<ProgressHistoryItem[]> {
    const progressHistory = await sql`
    SELECT
      assessment_date,
      weight_kg,
      body_fat_pct,
      muscle_pct,
      bmi
    FROM assessments
    WHERE client_id = ${id}
    ORDER BY assessment_date ASC, id ASC
  `;

    return progressHistory as ProgressHistoryItem[];
}