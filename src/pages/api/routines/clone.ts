import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema, getRoutineDetailsForUser } from "../../../lib/utils/routines";

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

  if (Number.isNaN(routineId)) {
    return redirect("/routines?status=error&message=Rutina%20inválida");
  }

  const routine = await getRoutineDetailsForUser(routineId, user);

  if (!routine || !routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const cloneName = `${routine.name} (copia)`;

  const routineRows = await sql`
    INSERT INTO routines (
      trainer_id,
      name,
      objective,
      level,
      duration_weeks,
      notes,
      is_template,
      active
    )
    VALUES (
      ${routine.trainer_id},
      ${cloneName},
      ${routine.objective},
      ${routine.level},
      ${routine.duration_weeks},
      ${routine.notes},
      TRUE,
      TRUE
    )
    RETURNING id
  `;

  const newRoutineId = routineRows[0].id as number;

  for (const day of routine.days) {
    const dayRows = await sql`
      INSERT INTO routine_days (
        routine_id,
        day_number,
        title,
        focus,
        notes
      )
      VALUES (
        ${newRoutineId},
        ${day.day_number},
        ${day.title},
        ${day.focus},
        ${day.notes}
      )
      RETURNING id
    `;

    const newDayId = dayRows[0].id as number;

    for (const exercise of day.exercises) {
      await sql`
        INSERT INTO routine_exercises (
          routine_day_id,
          position,
          exercise_key,
          name,
          sets,
          reps,
          rest_seconds,
          notes
        )
        VALUES (
          ${newDayId},
          ${exercise.position},
          ${exercise.exercise_key},
          ${exercise.name},
          ${exercise.sets},
          ${exercise.reps},
          ${exercise.rest_seconds},
          ${exercise.notes}
        )
      `;
    }
  }

  return redirect(`/routines/${newRoutineId}?status=success&message=Rutina%20clonada%20correctamente`);
};
