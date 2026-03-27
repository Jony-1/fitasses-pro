import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema, getAccessibleClientIdForUser } from "../../../lib/utils/routines";

type WorkoutExercisePayload = {
  routine_exercise_id: number;
  completed: boolean;
  weight_kg: number | null;
  reps_done: string;
  sets_done: number | null;
  rest_seconds: number | null;
  notes: string;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const parsed = Number(String(value).trim().replace(",", "."));
  return Number.isNaN(parsed) ? NaN : parsed;
}

function toInteger(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const normalized = String(value).trim();
  if (!/^-?\d+$/.test(normalized)) return NaN;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : NaN;
}

export const POST: APIRoute = async (context) => {
  try {
    const user = context.locals.user;

    if (!user) {
      return json({ error: "Debes iniciar sesión" }, 401);
    }

    await ensureRoutineSchema();

    const body = await context.request.json();
    const routineDayId = Number(body.routine_day_id);
    const clientId = Number(body.client_id);
    const startedAt = typeof body.started_at === "string" ? body.started_at : null;
    const finishedAt = typeof body.finished_at === "string" ? body.finished_at : null;
    const notes = typeof body.notes === "string" ? body.notes.trim() : "";
    const exercises = Array.isArray(body.exercises) ? body.exercises : [];

    if (!Number.isInteger(routineDayId) || routineDayId <= 0) {
      return json({ error: "Rutina inválida" }, 400);
    }

    const dayRows = await sql`
      SELECT
        rd.id,
        rd.routine_id,
        r.client_id,
        r.trainer_id
      FROM routine_days rd
      INNER JOIN routines r ON r.id = rd.routine_id
      WHERE rd.id = ${routineDayId}
      LIMIT 1
    `;

    const day = dayRows[0] as { id: number; routine_id: number; client_id: number | null; trainer_id: number } | undefined;

    if (!day || !day.client_id) {
      return json({ error: "La rutina no está asignada" }, 404);
    }

    const accessibleClientId = user.role === "client" ? await getAccessibleClientIdForUser(user) : clientId;

    if (!accessibleClientId || accessibleClientId !== day.client_id) {
      return json({ error: "Cliente inválido" }, 403);
    }

    if (user.role === "trainer" && day.trainer_id !== user.id) {
      return json({ error: "No tienes acceso a esta rutina" }, 403);
    }

    const exerciseRows = await sql`
      SELECT id
      FROM routine_exercises
      WHERE routine_day_id = ${routineDayId}
      ORDER BY position ASC, id ASC
    `;

    const allowedExerciseIds = new Set<number>((exerciseRows as unknown as Array<{ id: number }>).map((row) => row.id));
    const normalizedExercises: WorkoutExercisePayload[] = [];

    for (const rawExercise of exercises as Array<Record<string, unknown>>) {
      const routineExerciseId = Number(rawExercise.routine_exercise_id);
      const completed = Boolean(rawExercise.completed);
      const weightKg = toNumber(rawExercise.weight_kg);
      const repsDone = typeof rawExercise.reps_done === "string" ? rawExercise.reps_done.trim() : "";
      const setsDone = toInteger(rawExercise.sets_done);
      const restSeconds = toInteger(rawExercise.rest_seconds);
      const exerciseNotes = typeof rawExercise.notes === "string" ? rawExercise.notes.trim() : "";

      if (!allowedExerciseIds.has(routineExerciseId)) {
        return json({ error: "Ejercicio inválido" }, 400);
      }

      if (weightKg !== null && Number.isNaN(weightKg)) {
        return json({ error: "Peso inválido" }, 400);
      }

      if (setsDone !== null && Number.isNaN(setsDone)) {
        return json({ error: "Series inválidas" }, 400);
      }

      if (restSeconds !== null && Number.isNaN(restSeconds)) {
        return json({ error: "Descanso inválido" }, 400);
      }

      normalizedExercises.push({
        routine_exercise_id: routineExerciseId,
        completed,
        weight_kg: weightKg,
        reps_done: repsDone,
        sets_done: setsDone,
        rest_seconds: restSeconds,
        notes: exerciseNotes,
      });
    }

    const sessionRows = await sql`
      INSERT INTO routine_workout_sessions (
        routine_day_id,
        client_id,
        started_at,
        finished_at,
        notes
      )
      VALUES (
        ${routineDayId},
        ${day.client_id},
        ${startedAt || null},
        ${finishedAt || null},
        ${notes || null}
      )
      RETURNING id
    `;

    const session = sessionRows[0] as { id: number } | undefined;

    if (!session) {
      return json({ error: "No se pudo guardar la sesión" }, 500);
    }

    for (const exercise of normalizedExercises) {
      await sql`
        INSERT INTO routine_workout_entries (
          session_id,
          routine_exercise_id,
          completed,
          weight_kg,
          reps_done,
          sets_done,
          rest_seconds,
          notes
        )
        VALUES (
          ${session.id},
          ${exercise.routine_exercise_id},
          ${exercise.completed},
          ${exercise.weight_kg},
          ${exercise.reps_done || null},
          ${exercise.sets_done},
          ${exercise.rest_seconds},
          ${exercise.notes || null}
        )
        ON CONFLICT (session_id, routine_exercise_id)
        DO UPDATE SET
          completed = EXCLUDED.completed,
          weight_kg = EXCLUDED.weight_kg,
          reps_done = EXCLUDED.reps_done,
          sets_done = EXCLUDED.sets_done,
          rest_seconds = EXCLUDED.rest_seconds,
          notes = EXCLUDED.notes,
          updated_at = NOW()
      `;
    }

    return json({ message: "Sesión guardada correctamente", session_id: session.id }, 201);
  } catch (error) {
    console.error("Error guardando sesión de entrenamiento:", error);
    return json({ error: "No se pudo guardar la sesión" }, 500);
  }
};
