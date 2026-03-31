import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { asSqlExecutor } from "../../../lib/db/sql-executor";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
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
  const clientId = Number(String(formData.get("client_id") ?? "").trim());
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(String(value).trim()))
    .filter((value, index, array) => !Number.isNaN(value) && value >= 1 && value <= 7 && array.indexOf(value) === index)
    .sort((a, b) => a - b);
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const activateNow = String(formData.get("activate_now") ?? "").trim() === "1";
  const startDate = String(formData.get("start_date") ?? "").trim() || null;
  const scopeValue = String(formData.get("scope") ?? "always").trim();
  const scope = ["today", "week", "always"].includes(scopeValue) ? scopeValue : "always";

  if (
    Number.isNaN(routineId)
    || Number.isNaN(clientId)
  ) {
    return redirect("/routines?status=error&message=Datos%20inválidos");
  }

  if (weekdays.length === 0 && !activateNow) {
    return redirect(`/routines/${routineId}?status=error&message=Elige%20al%20menos%20un%20día%20o%20activa%20la%20rutina%20ahora`);
  }

  const routineRows = await sql`
    SELECT r.id, r.trainer_id, r.is_template, owner.gym_id
    FROM routines r
    LEFT JOIN users owner ON owner.id = r.trainer_id
    WHERE r.id = ${routineId}
      AND r.active = TRUE
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number; is_template: boolean; gym_id: number | null }>;

  const routine = routineRows[0];

  if (!routine || !routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (user.role === "trainer" && routine.trainer_id !== user.id) {
    return redirect("/login?error=forbidden");
  }

  if (user.role === "gym_manager" && (!user.gymId || routine.gym_id !== user.gymId)) {
    return redirect("/login?error=forbidden");
  }

  const clientRows = await sql`
    SELECT c.id, c.trainer_id, owner.gym_id
    FROM clients c
    LEFT JOIN users owner ON owner.id = c.trainer_id
    WHERE c.id = ${clientId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number | null; gym_id: number | null }>;

  const client = clientRows[0];

  if (!client) {
    return redirect(`/routines/${routineId}?status=error&message=Cliente%20no%20encontrado`);
  }

  if (user.role === "trainer" && client.trainer_id !== user.id) {
    return redirect("/login?error=forbidden");
  }

  if (user.role === "gym_manager" && (!user.gymId || client.gym_id !== user.gymId)) {
    return redirect("/login?error=forbidden");
  }

  await sql.begin(async (tx) => {
    const trx = asSqlExecutor(tx);

    for (const weekday of weekdays) {
      await trx`
          INSERT INTO routine_weekly_schedule (
            client_id,
            weekday,
            routine_id,
            notes,
            active,
            updated_at
          )
          VALUES (
            ${clientId},
            ${weekday},
            ${routineId},
            ${notes},
            TRUE,
            NOW()
          )
          ON CONFLICT (client_id, weekday)
          DO UPDATE SET
            routine_id = EXCLUDED.routine_id,
            notes = EXCLUDED.notes,
            active = TRUE,
            updated_at = NOW()
        `;
    }

    if (activateNow) {
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
          notes,
          active
        )
        VALUES (
          ${routineId},
          ${clientId},
          ${startDate},
          ${scope},
          TRUE,
          ${notes},
          TRUE
        )
      `;
    }
  });

  const successMessage = weekdays.length > 0 && activateNow
    ? "Rutina%20programada%20y%20activada"
    : weekdays.length > 0
      ? "Rutina%20programada%20en%20el%20calendario"
      : "Rutina%20activada%20para%20el%20cliente";

  return redirect(`/routines/${routineId}?status=success&message=${successMessage}`);
};
