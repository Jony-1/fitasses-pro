import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema, getAccessibleClientIdForUser } from "../../../lib/utils/routines";

export const POST: APIRoute = async (context) => {
  const { request, redirect, locals } = context;
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const routineDayId = Number(String(formData.get("routine_day_id") ?? "").trim());
  const clientIdRaw = String(formData.get("client_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (Number.isNaN(routineDayId)) {
    return redirect("/clients?status=error&message=Rutina%20inválida");
  }

  const dayRows = await sql`
    SELECT
      rd.id,
      r.trainer_id
    FROM routine_days rd
    INNER JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = ${routineDayId}
    LIMIT 1
  `;

  const day = dayRows[0] as { id: number; trainer_id: number } | undefined;

  if (!day) {
    return redirect("/clients?status=error&message=Rutina%20no%20encontrada");
  }

  const clientId = user.role === "client" ? await getAccessibleClientIdForUser(user) : Number(clientIdRaw);

  if (!clientId || Number.isNaN(clientId)) {
    return redirect("/clients?status=error&message=Cliente%20inválido");
  }

  if (user.role === "client") {
    if (clientId <= 0) {
      return redirect("/login?error=forbidden");
    }
  }

  if (user.role === "trainer" && day.trainer_id !== user.id) {
    return redirect("/login?error=forbidden");
  }
  
  if (user.role === "gym_manager") {
    const trainerRows = await sql`
      SELECT id FROM users WHERE id = ${day.trainer_id} AND gym_id = ${user.gymId}
    `;
    if (!trainerRows.length) {
      return redirect("/login?error=forbidden");
    }
  }

  const clientRows = await sql`
    SELECT id, trainer_id
    FROM clients
    WHERE id = ${clientId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number | null }>;

  const client = clientRows[0];

  if (!client) {
    return redirect("/clients?status=error&message=Cliente%20no%20encontrado");
  }

  if (client.trainer_id && client.trainer_id !== day.trainer_id) {
    return redirect("/login?error=forbidden");
  }

  await sql`
    INSERT INTO routine_day_completions (
      routine_day_id,
      client_id,
      notes
    )
    VALUES (
      ${routineDayId},
      ${clientId},
      ${notes}
    )
    ON CONFLICT (routine_day_id, client_id)
    DO UPDATE SET
      completed_at = NOW(),
      notes = EXCLUDED.notes
  `;

  return redirect(`/clients/${clientId}?status=success&message=Día%20marcado%20como%20completado`);
};
