import { sql } from "../db/client";

export async function getClientById(id: number) {
    const result = await sql`
    SELECT id, full_name, birth_date, height_m, notes, gender, created_at
    FROM clients
    WHERE id = ${id}
    LIMIT 1
  `;

    return result[0] ?? null;
}