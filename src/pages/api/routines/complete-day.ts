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
      r.client_id,
      r.trainer_id
    FROM routine_days rd
    INNER JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = ${routineDayId}
    LIMIT 1
  `;

  const day = dayRows[0] as { id: number; client_id: number | null; trainer_id: number } | undefined;

  if (!day || !day.client_id) {
    return redirect("/clients?status=error&message=Rutina%20no%20asignada");
  }

  if (user.role === "client") {
    const clientId = await getAccessibleClientIdForUser(user);

    if (!clientId || clientId !== day.client_id) {
      return redirect("/login?error=forbidden");
    }
  }

  if (user.role === "trainer" && day.trainer_id !== user.id) {
    return redirect("/login?error=forbidden");
  }

  const clientId = clientIdRaw ? Number(clientIdRaw) : day.client_id;

  if (Number.isNaN(clientId) || clientId !== day.client_id) {
    return redirect("/clients?status=error&message=Cliente%20inválido");
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
