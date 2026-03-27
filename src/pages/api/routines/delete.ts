import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

export const POST: APIRoute = async ({ request, locals, redirect }) => {
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

  const routineRows = await sql`
    SELECT id, trainer_id, is_template
    FROM routines
    WHERE id = ${routineId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number; is_template: boolean }>;

  if (routineRows.length === 0 || (user.role === "trainer" && routineRows[0].trainer_id !== user.id)) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  await sql`
    DELETE FROM routines
    WHERE id = ${routineId}
  `;

  return redirect("/routines?status=success&message=Rutina%20eliminada");
};
