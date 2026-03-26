import { sql } from "../db/client";

export type RoutineUserRole = "admin" | "gym_manager" | "trainer" | "client";

export type RoutineUser = {
  id: number;
  role: RoutineUserRole;
};

export type RoutineListItem = {
  id: number;
  trainer_id: number;
  client_id: number | null;
  client_name: string | null;
  name: string;
  objective: string | null;
  level: string | null;
  duration_weeks: number | null;
  notes: string | null;
  is_template: boolean;
  start_date: string | Date | null;
  active: boolean;
  created_at: string | Date | null;
  days_total: number;
  exercises_total: number;
};

export type RoutineExercise = {
  id: number;
  exercise_key: string | null;
  position: number;
  name: string;
  sets: number | null;
  reps: string | null;
  rest_seconds: number | null;
  notes: string | null;
};

export type RoutineDay = {
  id: number;
  day_number: number;
  title: string;
  focus: string | null;
  notes: string | null;
  completed_at: string | Date | null;
  attendance_status: "going" | "not_going" | null;
  attendance_time_slot: "morning" | "midday" | "night" | "other" | null;
  attendance_checked_at: string | Date | null;
  exercises: RoutineExercise[];
};

export type RoutineAttendanceTimeSlot = "morning" | "midday" | "night" | "other";

export type RoutineDetails = {
  id: number;
  trainer_id: number;
  client_id: number | null;
  client_name: string | null;
  client_email: string | null;
  name: string;
  objective: string | null;
  level: string | null;
  duration_weeks: number | null;
  notes: string | null;
  is_template: boolean;
  start_date: string | Date | null;
  active: boolean;
  created_at: string | Date | null;
  days: RoutineDay[];
};

type RoutineRow = Omit<RoutineDetails, "days">;

type ExampleRoutineExercise = {
  exercise_key: string;
  name: string;
  sets: number;
  reps: string;
  rest_seconds: number;
  notes: string;
};

type ExampleRoutineDay = {
  day_number: number;
  title: string;
  focus: string;
  notes: string;
  exercises: ExampleRoutineExercise[];
};

type ExampleRoutineTemplate = {
  name: string;
  objective: string;
  level: string;
  duration_weeks: number;
  notes: string;
  days: ExampleRoutineDay[];
};

export async function ensureRoutineSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS routines (
      id SERIAL PRIMARY KEY,
      trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      objective TEXT,
      level TEXT,
      duration_weeks INTEGER,
      notes TEXT,
      is_template BOOLEAN NOT NULL DEFAULT TRUE,
      start_date DATE,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_days (
      id SERIAL PRIMARY KEY,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      day_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      focus TEXT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (routine_id, day_number)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id SERIAL PRIMARY KEY,
      routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      exercise_key TEXT,
      name TEXT NOT NULL,
      sets INTEGER,
      reps TEXT,
      rest_seconds INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (routine_day_id, position)
    )
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'routine_exercises'
          AND column_name = 'exercise_key'
      ) THEN
        ALTER TABLE routine_exercises ADD COLUMN exercise_key TEXT;
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_day_completions (
      id SERIAL PRIMARY KEY,
      routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      completed_at TIMESTAMP DEFAULT NOW(),
      notes TEXT,
      UNIQUE (routine_day_id, client_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_day_attendances (
      id SERIAL PRIMARY KEY,
      routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK (status IN ('going', 'not_going')),
      time_slot TEXT NOT NULL DEFAULT 'other' CHECK (time_slot IN ('morning', 'midday', 'night', 'other')),
      checked_at TIMESTAMP DEFAULT NOW(),
      notes TEXT,
      UNIQUE (routine_day_id, client_id)
    )
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'routine_day_attendances'
          AND column_name = 'time_slot'
      ) THEN
        ALTER TABLE routine_day_attendances
        ADD COLUMN time_slot TEXT NOT NULL DEFAULT 'other';
      END IF;
    END $$;
  `;

  await sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'routine_day_attendances_time_slot_check'
      ) THEN
        ALTER TABLE routine_day_attendances
        ADD CONSTRAINT routine_day_attendances_time_slot_check
        CHECK (time_slot IN ('morning', 'midday', 'night', 'other'));
      END IF;
    END $$;
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_notifications (
      id SERIAL PRIMARY KEY,
      trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      routine_day_id INTEGER REFERENCES routine_days(id) ON DELETE CASCADE,
      attendance_id INTEGER REFERENCES routine_day_attendances(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      read_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await ensureExampleRoutineTemplates();
}

async function ensureExampleRoutineTemplates() {
  await sql`
    CREATE TABLE IF NOT EXISTS routine_example_seed_state (
      version TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const seedVersion = "2026-03-26-one-day-split-v1";
  const seedRows = await sql`
    SELECT version
    FROM routine_example_seed_state
    WHERE version = ${seedVersion}
    LIMIT 1
  `;

  if (seedRows.length > 0) {
    return;
  }

  const trainerRows = await sql`
    SELECT id
    FROM users
    WHERE role IN ('trainer', 'admin')
    ORDER BY CASE WHEN role = 'trainer' THEN 0 ELSE 1 END, id ASC
    LIMIT 1
  `;

  const trainerId = (trainerRows[0]?.id as number | undefined) ?? null;

  if (!trainerId) {
    return;
  }

  const templates: ExampleRoutineTemplate[] = [
    {
      name: "Lunes - Tren superior: pectoral + espalda",
      objective: "Hipertrofia intensa",
      level: "Intermedio",
      duration_weeks: 4,
      notes: "Ejemplo de un solo día. Mantén descansos de 60-90s y busca RIR 1-2 en los básicos.",
      days: [
        {
          day_number: 1,
          title: "Pectoral + espalda",
          focus: "Empuje y tirón",
          notes: "Trabaja pecho y espalda en una sola sesión con intensidad media-alta.",
          exercises: [
            { exercise_key: "incline_press", name: "Press inclinado", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Carga progresiva" },
            { exercise_key: "row", name: "Remo con barra", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Espalda firme" },
            { exercise_key: "bench_press", name: "Press banca", sets: 3, reps: "6-8", rest_seconds: 90, notes: "Control en la bajada" },
            { exercise_key: "pull_up", name: "Dominadas", sets: 3, reps: "6-8", rest_seconds: 90, notes: "Agarre completo" },
            { exercise_key: "cable_fly", name: "Cruce de poleas", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Apretar 1s" },
            { exercise_key: "face_pull", name: "Face pull", sets: 3, reps: "15-20", rest_seconds: 45, notes: "Salud del hombro" },
          ],
        },
      ],
    },
    {
      name: "Martes - Tren inferior: cuádriceps + aductores",
      objective: "Hipertrofia intensa",
      level: "Intermedio",
      duration_weeks: 4,
      notes: "Ejemplo de un solo día. Enfocada en cuádriceps y aductores con trabajo pesado y controlado.",
      days: [
        {
          day_number: 1,
          title: "Cuádriceps + aductores",
          focus: "Dominante de rodilla",
          notes: "Empieza con un patrón dominante de rodilla y cierra con aductores.",
          exercises: [
            { exercise_key: "back_squat", name: "Sentadilla trasera", sets: 4, reps: "6-8", rest_seconds: 120, notes: "Profundidad segura" },
            { exercise_key: "leg_press", name: "Prensa", sets: 4, reps: "10-12", rest_seconds: 90, notes: "Pies medios" },
            { exercise_key: "leg_extension", name: "Extensión de cuádriceps", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Pausa arriba" },
            { exercise_key: "hip_adduction", name: "Aducción de cadera", sets: 4, reps: "12-15", rest_seconds: 60, notes: "Apretar fuerte" },
            { exercise_key: "bulgarian_split_squat", name: "Búlgaras", sets: 3, reps: "10-12", rest_seconds: 75, notes: "Tronco estable" },
            { exercise_key: "cossack_squat", name: "Cossack squat", sets: 2, reps: "10 por lado", rest_seconds: 45, notes: "Movilidad y aductores" },
          ],
        },
      ],
    },
    {
      name: "Miércoles - Hombros + brazos",
      objective: "Hipertrofia intensa",
      level: "Intermedio",
      duration_weeks: 4,
      notes: "Ejemplo de un solo día. Busca congestión con buena técnica y descansos cortos.",
      days: [
        {
          day_number: 1,
          title: "Hombros + brazos",
          focus: "Deltoides y brazos",
          notes: "Trabaja hombro completo y accesorios para bíceps/tríceps.",
          exercises: [
            { exercise_key: "machine_shoulder_press", name: "Press hombros máquina", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Estabilidad" },
            { exercise_key: "lateral_raise", name: "Elevaciones laterales", sets: 4, reps: "12-15", rest_seconds: 45, notes: "Subida controlada" },
            { exercise_key: "arnold_press", name: "Press Arnold", sets: 3, reps: "10-12", rest_seconds: 75, notes: "Recorrido completo" },
            { exercise_key: "biceps_curl", name: "Curl bíceps", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Sin balanceo" },
            { exercise_key: "triceps_pushdown", name: "Pushdown tríceps", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Extensión total" },
            { exercise_key: "rear_delt_fly", name: "Pájaros", sets: 3, reps: "15-20", rest_seconds: 45, notes: "Deltoide posterior" },
          ],
        },
      ],
    },
    {
      name: "Jueves - Glúteos + isquios",
      objective: "Hipertrofia intensa",
      level: "Intermedio",
      duration_weeks: 4,
      notes: "Ejemplo de un solo día. Enfoque en cadena posterior con tensión constante.",
      days: [
        {
          day_number: 1,
          title: "Glúteos + isquios",
          focus: "Cadena posterior",
          notes: "Mantén la técnica en bisagra y controla el estiramiento.",
          exercises: [
            { exercise_key: "hip_thrust", name: "Hip thrust", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Pausa arriba" },
            { exercise_key: "romanian_deadlift", name: "Peso muerto rumano", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Cadera atrás" },
            { exercise_key: "leg_curl", name: "Curl femoral", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Contracción fuerte" },
            { exercise_key: "glute_bridge", name: "Puente glúteo", sets: 3, reps: "15", rest_seconds: 60, notes: "Apretar glúteos" },
            { exercise_key: "good_morning", name: "Buenos días", sets: 3, reps: "10-12", rest_seconds: 75, notes: "Espalda neutra" },
            { exercise_key: "hamstring_curl", name: "Curl femoral extra", sets: 2, reps: "15", rest_seconds: 45, notes: "Finalizador" },
          ],
        },
      ],
    },
    {
      name: "Viernes - Core + cardio",
      objective: "Acondicionamiento",
      level: "Intermedio",
      duration_weeks: 4,
      notes: "Ejemplo de un solo día. Ideal para cerrar la semana con trabajo de core y gasto calórico.",
      days: [
        {
          day_number: 1,
          title: "Core + cardio",
          focus: "Estabilidad y energía",
          notes: "Circuito mixto para abdomen, postura y ritmo cardiaco.",
          exercises: [
            { exercise_key: "plank", name: "Plancha", sets: 4, reps: "30-45s", rest_seconds: 45, notes: "Mantener abdomen firme" },
            { exercise_key: "russian_twist", name: "Russian twist", sets: 3, reps: "20", rest_seconds: 45, notes: "Rotación controlada" },
            { exercise_key: "mountain_climbers", name: "Mountain climbers", sets: 3, reps: "30-40s", rest_seconds: 45, notes: "Ritmo constante" },
            { exercise_key: "rope_jump", name: "Saltar cuerda", sets: 4, reps: "45s", rest_seconds: 30, notes: "Mantener respiración" },
            { exercise_key: "bike", name: "Bicicleta", sets: 3, reps: "2 min", rest_seconds: 45, notes: "Ritmo moderado" },
            { exercise_key: "dead_bug", name: "Dead bug", sets: 3, reps: "12 por lado", rest_seconds: 45, notes: "Control lumbo-pélvico" },
          ],
        },
      ],
    },
  ];

  const templateNames = templates.map((template) => template.name);
  await sql`
    DELETE FROM routines
    WHERE is_template = TRUE
      AND name = ANY(${templateNames})
  `;

  for (const template of templates) {

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
        ${trainerId},
        ${template.name},
        ${template.objective},
        ${template.level},
        ${template.duration_weeks},
        ${template.notes},
        TRUE,
        TRUE
      )
      RETURNING id
    `;

    const routineId = routineRows[0].id as number;

    for (const day of template.days) {
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
          ${day.day_number},
          ${day.title},
          ${day.focus},
          ${day.notes}
        )
        RETURNING id
      `;

      const routineDayId = dayRows[0].id as number;

      for (let position = 0; position < day.exercises.length; position += 1) {
        const exercise = day.exercises[position];

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
            ${position + 1},
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
  }

  await sql`
    INSERT INTO routine_example_seed_state (version)
    VALUES (${seedVersion})
  `;
}

export type RoutineToday = {
  day: RoutineDay | null;
  dayIndex: number | null;
  label: string;
};

export function getRoutineToday(routine: Pick<RoutineDetails, "days" | "start_date">): RoutineToday {
  if (!routine.days.length) {
    return { day: null, dayIndex: null, label: "Sin días" };
  }

  if (!routine.start_date) {
    return { day: routine.days[0] ?? null, dayIndex: 0, label: routine.days[0]?.title ?? "Hoy" };
  }

  const start = new Date(routine.start_date);
  const now = new Date();
  const startLocal = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowLocal = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffMs = nowLocal.getTime() - startLocal.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const index = ((diffDays % routine.days.length) + routine.days.length) % routine.days.length;
  const day = routine.days[index] ?? null;

  return {
    day,
    dayIndex: index,
    label: day ? `Hoy te toca ${day.title}` : "Hoy",
  };
}

export async function getRoutineListForUser(user: RoutineUser) {
  const userFilter =
    user.role === "admin"
      ? sql``
      : user.role === "trainer"
        ? sql`WHERE r.trainer_id = ${user.id}`
        : sql`WHERE 1 = 0`;

  const rows = await sql`
    SELECT
      r.id,
      r.trainer_id,
      r.client_id,
      c.full_name AS client_name,
      r.name,
      r.objective,
      r.level,
      r.duration_weeks,
      r.notes,
      r.is_template,
      r.start_date,
      r.active,
      r.created_at,
      COUNT(DISTINCT rd.id)::int AS days_total,
      COUNT(DISTINCT re.id)::int AS exercises_total
    FROM routines r
    LEFT JOIN clients c ON c.id = r.client_id
    LEFT JOIN routine_days rd ON rd.routine_id = r.id
    LEFT JOIN routine_exercises re ON re.routine_day_id = rd.id
    ${userFilter}
    GROUP BY r.id, c.full_name
    ORDER BY r.is_template DESC, r.created_at DESC, r.id DESC
  `;

  return rows as unknown as RoutineListItem[];
}

async function fetchRoutineBase(routineId: number, user: RoutineUser) {
  const accessFilter =
    user.role === "admin"
      ? sql``
      : user.role === "trainer"
        ? sql`AND r.trainer_id = ${user.id}`
        : sql`AND 1 = 0`;

  const rows = await sql`
    SELECT
      r.id,
      r.trainer_id,
      r.client_id,
      c.full_name AS client_name,
      cu.email AS client_email,
      r.name,
      r.objective,
      r.level,
      r.duration_weeks,
      r.notes,
      r.is_template,
      r.start_date,
      r.active,
      r.created_at
    FROM routines r
    LEFT JOIN clients c ON c.id = r.client_id
    LEFT JOIN users cu ON cu.id = c.user_id
    WHERE r.id = ${routineId}
    ${accessFilter}
    LIMIT 1
  `;

  return (rows[0] as RoutineRow | undefined) ?? null;
}

export async function getRoutineDetailsForUser(
  routineId: number,
  user: RoutineUser,
): Promise<RoutineDetails | null> {
  const routine = await fetchRoutineBase(routineId, user);

  if (!routine) {
    return null;
  }

  const completionClientId = routine.client_id;

  const dayRows = await sql`
    SELECT
      rd.id AS day_id,
      rd.day_number,
      rd.title AS day_title,
      rd.focus AS day_focus,
      rd.notes AS day_notes,
      rc.completed_at,
      ra.status AS attendance_status,
      ra.time_slot AS attendance_time_slot,
      ra.checked_at AS attendance_checked_at,
      re.id AS exercise_id,
      re.position,
      re.exercise_key,
      re.name AS exercise_name,
      re.sets,
      re.reps,
      re.rest_seconds,
      re.notes AS exercise_notes
    FROM routine_days rd
    LEFT JOIN routine_exercises re ON re.routine_day_id = rd.id
    LEFT JOIN routine_day_completions rc ON rc.routine_day_id = rd.id
      ${completionClientId ? sql`AND rc.client_id = ${completionClientId}` : sql``}
    LEFT JOIN routine_day_attendances ra ON ra.routine_day_id = rd.id
      ${completionClientId ? sql`AND ra.client_id = ${completionClientId}` : sql``}
    WHERE rd.routine_id = ${routineId}
    ORDER BY rd.day_number ASC, re.position ASC, re.id ASC
  `;

  const dayMap = new Map<number, RoutineDay>();

  for (const row of dayRows as unknown as Array<{
    day_id: number;
    day_number: number;
    day_title: string;
    day_focus: string | null;
    day_notes: string | null;
    completed_at: string | Date | null;
    attendance_status: "going" | "not_going" | null;
    attendance_time_slot: "morning" | "midday" | "night" | "other" | null;
    attendance_checked_at: string | Date | null;
    exercise_id: number | null;
    position: number | null;
    exercise_key: string | null;
    exercise_name: string | null;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    exercise_notes: string | null;
  }>) {
    const existingDay = dayMap.get(row.day_id);

    if (!existingDay) {
      dayMap.set(row.day_id, {
        id: row.day_id,
        day_number: row.day_number,
        title: row.day_title,
        focus: row.day_focus,
        notes: row.day_notes,
        completed_at: row.completed_at,
        attendance_status: row.attendance_status,
        attendance_time_slot: row.attendance_time_slot,
        attendance_checked_at: row.attendance_checked_at,
        exercises: [],
      });
    }

    if (row.exercise_id) {
      dayMap.get(row.day_id)?.exercises.push({
        id: row.exercise_id,
        exercise_key: row.exercise_key,
        position: row.position ?? 0,
        name: row.exercise_name ?? "",
        sets: row.sets,
        reps: row.reps,
        rest_seconds: row.rest_seconds,
        notes: row.exercise_notes,
      });
    }
  }

  return {
    ...routine,
    days: Array.from(dayMap.values()),
  };
}

export async function getActiveRoutineForClient(clientId: number) {
  const rows = await sql`
    SELECT id
    FROM routines
    WHERE client_id = ${clientId}
      AND is_template = FALSE
      AND active = TRUE
    ORDER BY created_at DESC, id DESC
    LIMIT 1
  `;

  const routineId = rows[0]?.id as number | undefined;

  if (!routineId) {
    return null;
  }

  const routine = await sql`
    SELECT
      r.id,
      r.trainer_id,
      r.client_id,
      c.full_name AS client_name,
      cu.email AS client_email,
      r.name,
      r.objective,
      r.level,
      r.duration_weeks,
      r.notes,
      r.is_template,
      r.start_date,
      r.active,
      r.created_at
    FROM routines r
    LEFT JOIN clients c ON c.id = r.client_id
    LEFT JOIN users cu ON cu.id = c.user_id
    WHERE r.id = ${routineId}
    LIMIT 1
  `;

  const base = routine[0] as RoutineRow | undefined;

  if (!base) {
    return null;
  }

  const dayRows = await sql`
    SELECT
      rd.id AS day_id,
      rd.day_number,
      rd.title AS day_title,
      rd.focus AS day_focus,
      rd.notes AS day_notes,
      rc.completed_at,
      ra.status AS attendance_status,
      ra.time_slot AS attendance_time_slot,
      ra.checked_at AS attendance_checked_at,
      re.id AS exercise_id,
      re.position,
      re.exercise_key,
      re.name AS exercise_name,
      re.sets,
      re.reps,
      re.rest_seconds,
      re.notes AS exercise_notes
    FROM routine_days rd
    LEFT JOIN routine_exercises re ON re.routine_day_id = rd.id
    LEFT JOIN routine_day_completions rc ON rc.routine_day_id = rd.id
      AND rc.client_id = ${clientId}
    LEFT JOIN routine_day_attendances ra ON ra.routine_day_id = rd.id
      AND ra.client_id = ${clientId}
    WHERE rd.routine_id = ${routineId}
    ORDER BY rd.day_number ASC, re.position ASC, re.id ASC
  `;

  const dayMap = new Map<number, RoutineDay>();

  for (const row of dayRows as unknown as Array<{
    day_id: number;
    day_number: number;
    day_title: string;
    day_focus: string | null;
    day_notes: string | null;
    completed_at: string | Date | null;
    attendance_status: "going" | "not_going" | null;
    attendance_time_slot: "morning" | "midday" | "night" | "other" | null;
    attendance_checked_at: string | Date | null;
    exercise_id: number | null;
    position: number | null;
    exercise_key: string | null;
    exercise_name: string | null;
    sets: number | null;
    reps: string | null;
    rest_seconds: number | null;
    exercise_notes: string | null;
  }>) {
    if (!dayMap.has(row.day_id)) {
      dayMap.set(row.day_id, {
        id: row.day_id,
        day_number: row.day_number,
        title: row.day_title,
        focus: row.day_focus,
        notes: row.day_notes,
        completed_at: row.completed_at,
        attendance_status: row.attendance_status,
        attendance_time_slot: row.attendance_time_slot,
        attendance_checked_at: row.attendance_checked_at,
        exercises: [],
      });
    }

    if (row.exercise_id) {
      dayMap.get(row.day_id)?.exercises.push({
        id: row.exercise_id,
        exercise_key: row.exercise_key,
        position: row.position ?? 0,
        name: row.exercise_name ?? "",
        sets: row.sets,
        reps: row.reps,
        rest_seconds: row.rest_seconds,
        notes: row.exercise_notes,
      });
    }
  }

  return {
    ...base,
    days: Array.from(dayMap.values()),
  } satisfies RoutineDetails;
}

export async function getAccessibleClientIdForUser(user: RoutineUser) {
  if (user.role === "client") {
    const rows = await sql`
      SELECT id
      FROM clients
      WHERE user_id = ${user.id}
      LIMIT 1
    `;

    return (rows[0]?.id as number | undefined) ?? null;
  }

  return null;
}
