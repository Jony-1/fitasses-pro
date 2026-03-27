import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema, getRoutineDetailsForUser } from "../../../lib/utils/routines";

export const POST: APIRoute = async (context) => {
  const { request, redirect, locals } = context;
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "trainer" && user.role !== "admin") {
    return redirect("/login?error=forbidden");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const routineId = Number(String(formData.get("routine_id") ?? "").trim());

  if (Number.isNaN(routineId)) {
    return redirect("/routines?status=error&message=Rutina%20inválida");
  }

  const routine = await getRoutineDetailsForUser(routineId, user);

  if (!routine || routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  if (routine.client_id) {
    await sql`
      DELETE FROM routines
      WHERE id = ${routineId}
    `;
  }

  return redirect(`/clients/${routine.client_id ?? ""}/routine?status=success&message=Rutina%20eliminada`);
};
