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
  const clientId = Number(String(formData.get("client_id") ?? "").trim());
  const preserveClientRoutine = String(formData.get("preserve_client_routine") ?? "").trim() === "1";

  if (Number.isNaN(routineId) || Number.isNaN(clientId)) {
    return redirect("/routines?status=error&message=Rutina%20inválida");
  }

  const routineRows = await sql`
    SELECT r.id, r.trainer_id, r.is_template, u.gym_id
    FROM routines r
    LEFT JOIN users u ON u.id = r.trainer_id
    WHERE r.id = ${routineId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number; is_template: boolean; gym_id: number | null }>;

  const routine = routineRows[0];

  if (!routine) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (user.role === "trainer" && routine.trainer_id !== user.id) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (user.role === "gym_manager" && (!user.gymId || routine.gym_id !== user.gymId)) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (preserveClientRoutine) {
    await sql`
      UPDATE routine_assignments
      SET template_visible = FALSE,
          active = FALSE,
          updated_at = NOW()
      WHERE routine_id = ${routineId}
        AND client_id = ${clientId}
        AND active = TRUE
    `;

    await sql`
      UPDATE routines
      SET active = FALSE,
          updated_at = NOW()
      WHERE trainer_id = ${routine.trainer_id}
        AND client_id = ${clientId}
        AND is_template = FALSE
        AND active = TRUE
    `;

    return redirect(`/routines/${routineId}?status=success&message=Cliente%20retirado%20de%20la%20plantilla`);
  } else {
    await sql`
      UPDATE routine_assignments
      SET active = FALSE,
          updated_at = NOW()
      WHERE routine_id = ${routineId}
        AND client_id = ${clientId}
        AND active = TRUE
    `;

    return redirect(`/clients/${clientId}/routine?status=success&message=Rutina%20eliminada`);
  }
};
