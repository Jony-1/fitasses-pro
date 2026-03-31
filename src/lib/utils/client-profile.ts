import { sql } from "../db/client";

export type AppUserRole = "admin" | "gym_manager" | "trainer" | "client";

export type AppUser = {
  id: number;
  role: AppUserRole;
  gymId?: number | null;
};

export type Client = {
  id: number;
  trainer_id: number;
  user_id?: number | null;
  full_name: string;
  birth_date: string | Date | null;
  height_m: number | null;
  notes: string | null;
  gender: string | null;
  active?: boolean;
  created_at: string | Date | null;
  updated_at?: string | Date | null;
};

export type ClientListItem = {
  id: number;
  full_name: string;
  birth_date: string | Date | null;
  height_m: number | null;
  gender: string | null;
  active: boolean;
  created_at: string | Date | null;
  updated_at: string | Date | null;
  trainer_id: number;
  trainer_name: string;
  trainer_email: string;
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
    SELECT
      id,
      trainer_id,
      full_name,
      birth_date,
      height_m,
      notes,
      gender,
      active,
      user_id,
      created_at,
      updated_at
    FROM clients
    WHERE id = ${id}
    LIMIT 1
  `;

  return (result[0] as Client) ?? null;
}

export async function getClientByUserId(userId: number): Promise<Client | null> {
  const result = await sql`
    SELECT
      id,
      trainer_id,
      full_name,
      birth_date,
      height_m,
      notes,
      gender,
      active,
      user_id,
      created_at,
      updated_at
    FROM clients
    WHERE user_id = ${userId}
    LIMIT 1
  `;

  return (result[0] as Client) ?? null;
}

export async function getClientsForUser(
  user: AppUser,
): Promise<ClientListItem[]> {
  if (user.role === "admin") {
    const result = await sql`
      SELECT
        c.id,
        c.full_name,
        c.birth_date,
        c.height_m,
        c.gender,
        c.active,
        c.created_at,
        c.updated_at,
        c.trainer_id,
        u.name AS trainer_name,
        u.email AS trainer_email
      FROM clients c
      INNER JOIN users u ON u.id = c.trainer_id
      ORDER BY c.created_at DESC, c.id DESC
    `;

    return result as ClientListItem[];
  }

  if (user.role === "gym_manager" && user.gymId) {
    const result = await sql`
      SELECT
        c.id,
        c.full_name,
        c.birth_date,
        c.height_m,
        c.gender,
        c.active,
        c.created_at,
        c.updated_at,
        c.trainer_id,
        u.name AS trainer_name,
        u.email AS trainer_email
      FROM clients c
      INNER JOIN users u ON u.id = c.trainer_id
      WHERE u.gym_id = ${user.gymId}
      ORDER BY c.created_at DESC, c.id DESC
    `;

    return result as ClientListItem[];
  }

  if (user.role === "trainer") {
    const result = await sql`
      SELECT
        c.id,
        c.full_name,
        c.birth_date,
        c.height_m,
        c.gender,
        c.active,
        c.created_at,
        c.updated_at,
        c.trainer_id,
        u.name AS trainer_name,
        u.email AS trainer_email
      FROM clients c
      INNER JOIN users u ON u.id = c.trainer_id
      WHERE c.trainer_id = ${user.id}
      ORDER BY c.created_at DESC, c.id DESC
    `;

    return result as ClientListItem[];
  }

  return [];
}

export async function getClientByIdForUser(clientId: number, user: AppUser) {
  if (user.role === "admin") {
    const result = await sql`
      SELECT
        id,
        trainer_id,
        full_name,
        birth_date,
        height_m,
        notes,
        gender,
        active,
        user_id,
        created_at,
        updated_at
      FROM clients
      WHERE id = ${clientId}
      LIMIT 1
    `;

    return result[0] ?? null;
  }

  if (user.role === "gym_manager" && user.gymId) {
    const result = await sql`
      SELECT
        c.id,
        c.trainer_id,
        c.full_name,
        c.birth_date,
        c.height_m,
        c.notes,
        c.gender,
        c.active,
        c.user_id,
        c.created_at,
        c.updated_at
      FROM clients c
      INNER JOIN users u ON u.id = c.trainer_id
      WHERE c.id = ${clientId}
        AND u.gym_id = ${user.gymId}
      LIMIT 1
    `;

    return result[0] ?? null;
  }

  if (user.role === "trainer") {
    const result = await sql`
      SELECT
        id,
        trainer_id,
        full_name,
        birth_date,
        height_m,
        notes,
        gender,
        active,
        user_id,
        created_at,
        updated_at
      FROM clients
      WHERE id = ${clientId}
        AND trainer_id = ${user.id}
      LIMIT 1
    `;

    return result[0] ?? null;
  }

  if (user.role === "client") {
    const result = await sql`
      SELECT
        id,
        trainer_id,
        full_name,
        birth_date,
        height_m,
        notes,
        gender,
        active,
        user_id,
        created_at,
        updated_at
      FROM clients
      WHERE id = ${clientId}
        AND user_id = ${user.id}
      LIMIT 1
    `;

    return result[0] ?? null;
  }

  return null;
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
