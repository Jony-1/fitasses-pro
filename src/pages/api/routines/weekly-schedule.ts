import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { asSqlExecutor } from "../../../lib/db/sql-executor";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

function parseRoutineId(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());

  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}

function parseWeekdayEntries(formData: FormData) {
  return Array.from({ length: 7 }, (_, index) => {
    const weekday = index + 1;

    return {
      weekday,
      routineId: parseRoutineId(formData.get(`weekday_${weekday}`)),
      notes: String(formData.get(`notes_${weekday}`) ?? "").trim() || null,
    };
  });
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const clientId = Number(String(formData.get("client_id") ?? "").trim());

  if (Number.isNaN(clientId) || clientId <= 0) {
    return redirect("/clients?status=error&message=Cliente%20inválido");
  }

  const clientRows = await sql`
    SELECT
      c.id,
      c.user_id,
      c.trainer_id,
      u.gym_id AS trainer_gym_id
    FROM clients c
    LEFT JOIN users u ON u.id = c.trainer_id
    WHERE c.id = ${clientId}
    LIMIT 1
  ` as Array<{
    id: number;
    user_id: number | null;
    trainer_id: number | null;
    trainer_gym_id: number | null;
  }>;

  const client = clientRows[0];

  if (!client) {
    return redirect("/clients?status=error&message=Cliente%20no%20encontrado");
  }

  const canManageAsTrainer =
    user.role === "admin"
    || (user.role === "trainer" && client.trainer_id === user.id)
    || (user.role === "gym_manager" && !!user.gymId && client.trainer_gym_id === user.gymId);

  const canSelfManage = user.role === "client" && client.user_id === user.id && !client.trainer_id;

  if (!canManageAsTrainer && !canSelfManage) {
    return redirect("/login?error=forbidden");
  }

  const entries = parseWeekdayEntries(formData);
  const routineIds = entries
    .map((entry) => entry.routineId)
    .filter((value): value is number => value !== null);

  if (routineIds.length > 0) {
    const routineRows = await sql`
      SELECT
        r.id,
        r.trainer_id,
        owner.gym_id
      FROM routines r
      LEFT JOIN users owner ON owner.id = r.trainer_id
      WHERE r.id = ANY(${routineIds})
        AND r.is_template = TRUE
        AND r.active = TRUE
    ` as Array<{ id: number; trainer_id: number; gym_id: number | null }>;

    const allowedRoutineIds = new Set(
      routineRows
        .filter((routine) => {
          if (user.role === "admin") {
            return true;
          }

          if (user.role === "trainer") {
            return routine.trainer_id === user.id;
          }

          if (user.role === "gym_manager") {
            return !!user.gymId && routine.gym_id === user.gymId;
          }

          return canSelfManage && client.trainer_id === null;
        })
        .map((routine) => routine.id),
    );

    if (allowedRoutineIds.size !== routineIds.length) {
      return redirect(`/clients/${clientId}/routine?status=error&message=Rutina%20no%20permitida`);
    }
  }

  await sql.begin(async (tx) => {
    const trx = asSqlExecutor(tx);

    for (const entry of entries) {
      if (!entry.routineId) {
        await trx`
          DELETE FROM routine_weekly_schedule
          WHERE client_id = ${clientId}
            AND weekday = ${entry.weekday}
        `;
        continue;
      }

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
          ${entry.weekday},
          ${entry.routineId},
          ${entry.notes},
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
  });

  return redirect(`/clients/${clientId}/routine?status=success&message=Calendario%20guardado`);
};
