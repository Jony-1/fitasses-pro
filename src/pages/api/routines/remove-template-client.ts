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

  if (Number.isNaN(routineId) || Number.isNaN(clientId)) {
    return redirect("/routines?status=error&message=Datos%20inválidos");
  }

  const routineRows = await sql`
    SELECT r.id, r.trainer_id, r.is_template, owner.gym_id
    FROM routines r
    LEFT JOIN users owner ON owner.id = r.trainer_id
    WHERE r.id = ${routineId}
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

  await sql.begin(async (tx) => {
    const trx = asSqlExecutor(tx);

    await trx`
      DELETE FROM routine_weekly_schedule
      WHERE routine_id = ${routineId}
        AND client_id = ${clientId}
    `;

    await trx`
      UPDATE routine_assignments
      SET active = FALSE,
          template_visible = FALSE,
          updated_at = NOW()
      WHERE routine_id = ${routineId}
        AND client_id = ${clientId}
        AND active = TRUE
    `;
  });

  return redirect(`/routines/${routineId}?status=success&message=Cliente%20retirado%20de%20la%20plantilla`);
};
