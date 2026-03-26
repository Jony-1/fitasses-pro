import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

type ParsedExercise = {
  exerciseKey: string | null;
  name: string;
  sets: number | null;
  reps: string | null;
  restSeconds: number | null;
  notes: string | null;
};

type ParsedDay = {
  dayNumber: number;
  title: string;
  focus: string | null;
  notes: string | null;
  exercises: ParsedExercise[];
};

function parseNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);

  return Number.isNaN(parsed) ? null : parsed;
}

export function parseRoutineFormData(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const objective = String(formData.get("objective") ?? "").trim() || null;
  const level = String(formData.get("level") ?? "").trim() || null;
  const durationWeeksRaw = String(formData.get("duration_weeks") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const dayMap = new Map<
    number,
    { title: string; focus: string | null; notes: string | null; exercises: Map<number, ParsedExercise> }
  >();

  for (const [key, value] of formData.entries()) {
    const stringValue = String(value).trim();

    const dayFieldMatch = key.match(/^days\[(\d+)\]\[(title|focus|notes)\]$/);
    if (dayFieldMatch) {
      const dayIndex = Number(dayFieldMatch[1]);
      const field = dayFieldMatch[2];
      const existing = dayMap.get(dayIndex) ?? {
        title: "",
        focus: null,
        notes: null,
        exercises: new Map<number, ParsedExercise>(),
      };

      if (field === "title") {
        existing.title = stringValue;
      } else if (field === "focus") {
        existing.focus = stringValue || null;
      } else {
        existing.notes = stringValue || null;
      }

      dayMap.set(dayIndex, existing);
      continue;
    }

    const exerciseFieldMatch = key.match(
      /^days\[(\d+)\]\[exercises\]\[(\d+)\]\[(exercise_key|name|sets|reps|rest_seconds|notes)\]$/,
    );

    if (exerciseFieldMatch) {
      const dayIndex = Number(exerciseFieldMatch[1]);
      const exerciseIndex = Number(exerciseFieldMatch[2]);
      const field = exerciseFieldMatch[3];

      const day = dayMap.get(dayIndex) ?? {
        title: "",
        focus: null,
        notes: null,
        exercises: new Map<number, ParsedExercise>(),
      };

      const exercise = day.exercises.get(exerciseIndex) ?? {
        exerciseKey: null,
        name: "",
        sets: null,
        reps: null,
        restSeconds: null,
        notes: null,
      };

      if (field === "exercise_key") {
        exercise.exerciseKey = stringValue || null;
      } else if (field === "name") {
        exercise.name = stringValue;
      } else if (field === "sets") {
        exercise.sets = parseNumber(stringValue);
      } else if (field === "reps") {
        exercise.reps = stringValue || null;
      } else if (field === "rest_seconds") {
        exercise.restSeconds = parseNumber(stringValue);
      } else {
        exercise.notes = stringValue || null;
      }

      day.exercises.set(exerciseIndex, exercise);
      dayMap.set(dayIndex, day);
    }
  }

  const durationWeeks = parseNumber(durationWeeksRaw);

  const days: ParsedDay[] = Array.from(dayMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([dayNumber, day]) => ({
      dayNumber,
      title: day.title.trim(),
      focus: day.focus,
      notes: day.notes,
      exercises: Array.from(day.exercises.entries())
        .sort(([a], [b]) => a - b)
        .map(([, exercise]) => ({
          exerciseKey: exercise.exerciseKey,
          name: exercise.name.trim(),
          sets: exercise.sets,
          reps: exercise.reps,
          restSeconds: exercise.restSeconds,
          notes: exercise.notes,
        }))
        .filter((exercise) => exercise.name.length > 0),
    }))
    .filter((day) => day.title.length > 0 || day.exercises.length > 0);

  return {
    name,
    objective,
    level,
    durationWeeks,
    notes,
    days,
  };
}

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
  const parsed = parseRoutineFormData(formData);

  if (!parsed.name) {
    return redirect("/routines/new?error=missing_name");
  }

  if (!parsed.days.length) {
    return redirect("/routines/new?error=missing_days");
  }

  for (const day of parsed.days) {
    if (!day.title) {
      return redirect("/routines/new?error=missing_day_title");
    }

    if (!day.exercises.length) {
      return redirect("/routines/new?error=missing_exercises");
    }
  }

  if (
    parsed.durationWeeks !== null &&
    (parsed.durationWeeks <= 0 || !Number.isInteger(parsed.durationWeeks))
  ) {
    return redirect("/routines/new?error=invalid_duration");
  }

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
      ${user.id},
      ${parsed.name},
      ${parsed.objective},
      ${parsed.level},
      ${parsed.durationWeeks},
      ${parsed.notes},
      TRUE,
      TRUE
    )
    RETURNING id
  `;

  const created = routineRows[0].id as number;

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
        ${created},
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
          ${exercise.name},
          ${exercise.sets},
          ${exercise.reps},
          ${exercise.restSeconds},
          ${exercise.notes}
        )
      `;
    }
  }

  return redirect(`/routines/${created}?status=success&message=Rutina%20creada%20correctamente`);
};
