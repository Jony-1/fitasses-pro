import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
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

  if (Number.isNaN(routineId)) {
    return redirect("/routines?status=error&message=Rutina%20inválida");
  }

  const routineRows = await sql`
    SELECT r.id, r.trainer_id, r.is_template, u.gym_id
    FROM routines r
    LEFT JOIN users u ON u.id = r.trainer_id
    WHERE r.id = ${routineId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number; is_template: boolean; gym_id: number | null }>;

  if (routineRows.length === 0) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const routine = routineRows[0];

  if (user.role === "trainer" && routine.trainer_id !== user.id) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (user.role === "gym_manager" && (!user.gymId || routine.gym_id !== user.gymId)) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const assignedClientRows = routine.is_template
    ? await sql`
        SELECT DISTINCT client_id
        FROM routine_assignments
        WHERE routine_id = ${routineId}
          AND active = TRUE
      ` as Array<{ client_id: number }>
    : [];

  const assignedClientIds = assignedClientRows.map((row) => row.client_id);

  if (routine.is_template && assignedClientIds.length > 0) {
    await sql`
      DELETE FROM routines
      WHERE trainer_id = ${routine.trainer_id}
        AND is_template = FALSE
        AND client_id = ANY(${assignedClientIds})
    `;
  }

  await sql`
    DELETE FROM routines
    WHERE id = ${routineId}
  `;

  return redirect("/routines?status=success&message=Rutina%20eliminada");
};
