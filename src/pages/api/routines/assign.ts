import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

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
  const clientId = Number(String(formData.get("client_id") ?? "").trim());
  const startDate = String(formData.get("start_date") ?? "").trim() || null;

  if (Number.isNaN(routineId) || Number.isNaN(clientId)) {
    return redirect("/routines?status=error&message=Datos%20inválidos");
  }

  const routineRows = await sql`
    SELECT id, trainer_id, name, objective, level, duration_weeks, notes, active, is_template
    FROM routines
    WHERE id = ${routineId}
      ${user.role === "trainer" ? sql`AND trainer_id = ${user.id}` : sql``}
    LIMIT 1
  `;

  const routine = routineRows[0];

  if (!routine || !routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const clientRows = await sql`
    SELECT id, full_name, trainer_id
    FROM clients
    WHERE id = ${clientId}
      ${user.role === "trainer" ? sql`AND trainer_id = ${user.id}` : sql``}
    LIMIT 1
  `;

  if (clientRows.length === 0) {
    return redirect(`/routines/${routineId}?status=error&message=Cliente%20no%20encontrado`);
  }

  const insertedRoutine = await sql`
    INSERT INTO routines (
      trainer_id,
      client_id,
      name,
      objective,
      level,
      duration_weeks,
      notes,
      is_template,
      start_date,
      active
    )
    VALUES (
      ${routine.trainer_id},
      ${clientId},
      ${routine.name},
      ${routine.objective},
      ${routine.level},
      ${routine.duration_weeks},
      ${routine.notes},
      FALSE,
      ${startDate},
      TRUE
    )
    RETURNING id
  `;

  const assignedRoutineId = insertedRoutine[0].id as number;

  const templateDays = await sql`
    SELECT id, day_number, title, focus, notes
    FROM routine_days
    WHERE routine_id = ${routineId}
    ORDER BY day_number ASC, id ASC
  ` as unknown as Array<{
    id: number;
    day_number: number;
    title: string;
    focus: string | null;
    notes: string | null;
  }>;

  for (const templateDay of templateDays as Array<{
    id: number;
    day_number: number;
    title: string;
    focus: string | null;
    notes: string | null;
  }>) {
    const newDayRows = await sql`
      INSERT INTO routine_days (
        routine_id,
        day_number,
        title,
        focus,
        notes
      )
      VALUES (
        ${assignedRoutineId},
        ${templateDay.day_number},
        ${templateDay.title},
        ${templateDay.focus},
        ${templateDay.notes}
      )
      RETURNING id
    `;

    const newDayId = newDayRows[0].id as number;

    const templateExercises = await sql`
      SELECT position, exercise_key, image_url, name, sets, reps, rest_seconds, notes
      FROM routine_exercises
      WHERE routine_day_id = ${templateDay.id}
      ORDER BY position ASC, id ASC
    ` as unknown as Array<{
      position: number;
      exercise_key: string | null;
      image_url: string | null;
      name: string;
      sets: number | null;
      reps: string | null;
      rest_seconds: number | null;
      notes: string | null;
    }>;

    for (const templateExercise of templateExercises as Array<{
      position: number;
      exercise_key: string | null;
      image_url: string | null;
      name: string;
      sets: number | null;
      reps: string | null;
      rest_seconds: number | null;
      notes: string | null;
    }>) {
      await sql`
        INSERT INTO routine_exercises (
          routine_day_id,
          position,
          exercise_key,
          image_url,
          name,
          sets,
          reps,
          rest_seconds,
          notes
        )
        VALUES (
          ${newDayId},
          ${templateExercise.position},
          ${templateExercise.exercise_key},
          ${templateExercise.image_url},
          ${templateExercise.name},
          ${templateExercise.sets},
          ${templateExercise.reps},
          ${templateExercise.rest_seconds},
          ${templateExercise.notes}
        )
      `;
    }
  }

  return redirect(`/routines/${assignedRoutineId}?status=success&message=Rutina%20asignada%20correctamente`);
};
