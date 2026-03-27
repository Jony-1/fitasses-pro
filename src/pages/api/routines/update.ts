import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema, getRoutineDetailsForUser } from "../../../lib/utils/routines";
import { parseRoutineFormData } from "./create";

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

  if (!routine || !routine.is_template) {
    return redirect("/routines?status=error&message=Rutina%20no%20encontrada");
  }

  const parsed = parseRoutineFormData(formData);

  if (!parsed.name) {
    return redirect(`/routines/${routineId}/edit?status=error&message=Nombre%20requerido`);
  }

  if (!parsed.days.length) {
    return redirect(`/routines/${routineId}/edit?status=error&message=Agrega%20al%20menos%20un%20día`);
  }

  for (const day of parsed.days) {
    if (!day.title) {
      return redirect(`/routines/${routineId}/edit?status=error&message=Falta%20el%20título%20de%20un%20día`);
    }

    if (!day.exercises.length) {
      return redirect(`/routines/${routineId}/edit?status=error&message=Cada%20día%20necesita%20ejercicios`);
    }
  }

  if (parsed.durationWeeks !== null && (parsed.durationWeeks <= 0 || !Number.isInteger(parsed.durationWeeks))) {
    return redirect(`/routines/${routineId}/edit?status=error&message=Duración%20inválida`);
  }

  await sql`
    UPDATE routines
    SET
      name = ${parsed.name},
      objective = ${parsed.objective},
      level = ${parsed.level},
      duration_weeks = ${parsed.durationWeeks},
      notes = ${parsed.notes},
      updated_at = NOW()
    WHERE id = ${routineId}
  `;

  await sql`
    DELETE FROM routine_days
    WHERE routine_id = ${routineId}
  `;

  for (const day of parsed.days) {
    const dayRows = await sql`
      INSERT INTO routine_days (
        routine_id,
        day_number,
        title,
        focus,
        notes
      )
      VALUES (
        ${routineId},
        ${day.dayNumber},
        ${day.title},
        ${day.focus},
        ${day.notes}
      )
      RETURNING id
    `;

    const routineDayId = dayRows[0].id as number;

    for (let index = 0; index < day.exercises.length; index += 1) {
      const exercise = day.exercises[index];

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
          ${routineDayId},
          ${index + 1},
          ${exercise.exerciseKey},
          ${exercise.imageUrl ?? null},
          ${exercise.name},
          ${exercise.sets},
          ${exercise.reps},
          ${exercise.restSeconds},
          ${exercise.notes}
        )
      `;
    }
  }

  return redirect(`/routines/${routineId}?status=success&message=Rutina%20actualizada%20correctamente`);
};
