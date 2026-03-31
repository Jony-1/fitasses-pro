import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

export const POST: APIRoute = async (context) => {
  const { request, redirect, locals } = context;
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "trainer" && user.role !== "admin" && user.role !== "gym_manager") {
    return redirect("/login?error=forbidden");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const routineId = Number(String(formData.get("routine_id") ?? "").trim());
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const scopeValue = String(formData.get("scope") ?? "always").trim();
  const scope = ["today", "week", "always"].includes(scopeValue) ? scopeValue : "always";
  const clientIds = formData.getAll("client_ids").map((value) => Number(String(value).trim())).filter((value) => !Number.isNaN(value));
  const singleClientId = Number(String(formData.get("client_id") ?? "").trim());
  const resolvedClientIds = clientIds.length > 0 ? clientIds : !Number.isNaN(singleClientId) ? [singleClientId] : [];

  if (Number.isNaN(routineId) || resolvedClientIds.length === 0) {
    return redirect("/routines?status=error&message=Datos%20inválidos");
  }

  const routineRows = await sql`
    SELECT id, trainer_id, name, objective, level, duration_weeks, notes, active, is_template
    FROM routines
    WHERE id = ${routineId}
      ${user.role === "trainer" ? sql`AND trainer_id = ${user.id}` : user.role === "gym_manager" ? sql`AND trainer_id IN (SELECT id FROM users WHERE gym_id = ${user.gymId})` : sql``}
    LIMIT 1
  `;

  const routine = routineRows[0];

  if (!routine || !routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const clientRows = await sql`
    SELECT id, full_name, trainer_id
    FROM clients
    WHERE id = ANY(${resolvedClientIds})
      ${user.role === "trainer" ? sql`AND trainer_id = ${user.id}` : user.role === "gym_manager" ? sql`AND trainer_id IN (SELECT id FROM users WHERE gym_id = ${user.gymId})` : sql``}
  ` as Array<{ id: number; full_name: string; trainer_id: number | null }>;

  const allowedClientIds = new Set(clientRows.map((row) => row.id));

  if (allowedClientIds.size === 0) {
    return redirect(`/routines/${routineId}?status=error&message=Cliente%20no%20encontrado`);
  }

  await sql.begin(async (tx) => {
    const trx = tx as any;

    for (const clientId of allowedClientIds) {
      await trx`
        UPDATE routine_assignments
        SET active = FALSE,
            updated_at = NOW()
        WHERE client_id = ${clientId}
          AND active = TRUE
      `;

      await trx`
        INSERT INTO routine_assignments (
          routine_id,
          client_id,
          start_date,
          scope,
          template_visible,
          active
        )
        VALUES (
          ${routineId},
          ${clientId},
          ${startDate},
          ${scope},
          TRUE,
          TRUE
        )
      `;
    }
  });

  return redirect(`/routines/${routineId}?status=success&message=Rutina%20asignada%20a%20${allowedClientIds.size}%20cliente(s)`);
};
