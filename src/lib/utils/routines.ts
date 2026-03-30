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
  assigned_clients_total: number;
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

export type RoutineAssignment = {
  id: number;
  routine_id: number;
  client_id: number;
  client_name: string | null;
  start_date: string | Date | null;
  scope: "today" | "week" | "always";
  template_visible: boolean;
  active: boolean;
  time_slot: RoutineAttendanceTimeSlot | null;
  notes: string | null;
  created_at: string | Date | null;
};

export type RoutineExercise = {
  id: number;
  exercise_key: string | null;
  imageUrl: string | null;
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

let ensureRoutineSchemaPromise: Promise<void> | null = null;

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
  if (ensureRoutineSchemaPromise) {
    return ensureRoutineSchemaPromise;
  }

  ensureRoutineSchemaPromise = (async () => {
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

  await sql`CREATE INDEX IF NOT EXISTS routines_client_active_idx ON routines (client_id, active, is_template, created_at DESC, id DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS routines_trainer_name_template_idx ON routines (trainer_id, name, is_template)`;

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

  await sql`CREATE INDEX IF NOT EXISTS routine_days_routine_id_idx ON routine_days (routine_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_exercises (
      id SERIAL PRIMARY KEY,
      routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      exercise_key TEXT,
      image_url TEXT,
      name TEXT NOT NULL,
      sets INTEGER,
      reps TEXT,
      rest_seconds INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (routine_day_id, position)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS routine_exercises_day_id_position_idx ON routine_exercises (routine_day_id, position)`;

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

      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'routine_exercises'
          AND column_name = 'image_url'
      ) THEN
        ALTER TABLE routine_exercises ADD COLUMN image_url TEXT;
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

  await sql`CREATE INDEX IF NOT EXISTS routine_day_completions_client_day_idx ON routine_day_completions (client_id, routine_day_id)`;

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

  await sql`CREATE INDEX IF NOT EXISTS routine_day_attendances_client_day_idx ON routine_day_attendances (client_id, routine_day_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_workout_sessions (
      id SERIAL PRIMARY KEY,
      routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      started_at TIMESTAMP NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMP,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS routine_workout_sessions_client_created_idx ON routine_workout_sessions (client_id, created_at DESC, id DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS routine_workout_sessions_day_idx ON routine_workout_sessions (routine_day_id, created_at DESC, id DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_workout_entries (
      id SERIAL PRIMARY KEY,
      session_id INTEGER NOT NULL REFERENCES routine_workout_sessions(id) ON DELETE CASCADE,
      routine_exercise_id INTEGER NOT NULL REFERENCES routine_exercises(id) ON DELETE CASCADE,
      completed BOOLEAN NOT NULL DEFAULT FALSE,
      weight_kg NUMERIC(6,2),
      reps_done TEXT,
      sets_done INTEGER,
      rest_seconds INTEGER,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (session_id, routine_exercise_id)
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS routine_workout_entries_session_idx ON routine_workout_entries (session_id, id DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS routine_workout_entries_exercise_idx ON routine_workout_entries (routine_exercise_id, session_id, id DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS routine_workout_sessions_client_day_started_idx ON routine_workout_sessions (client_id, routine_day_id, started_at DESC, id DESC)`;

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

  await sql`CREATE INDEX IF NOT EXISTS routine_notifications_trainer_created_idx ON routine_notifications (trainer_id, created_at DESC)`;

  await sql`
    CREATE TABLE IF NOT EXISTS routine_assignments (
      id SERIAL PRIMARY KEY,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      start_date DATE,
      scope TEXT NOT NULL DEFAULT 'always' CHECK (scope IN ('today', 'week', 'always')),
      template_visible BOOLEAN NOT NULL DEFAULT TRUE,
      time_slot TEXT DEFAULT NULL CHECK (time_slot IN ('morning', 'midday', 'night', 'other')),
      notes TEXT,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS routine_assignments_routine_active_idx ON routine_assignments (routine_id, active, created_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS routine_assignments_client_active_idx ON routine_assignments (client_id, active, created_at DESC)`;
  await sql`ALTER TABLE routine_assignments ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'always'`;
  await sql`ALTER TABLE routine_assignments ADD COLUMN IF NOT EXISTS template_visible BOOLEAN NOT NULL DEFAULT TRUE`;

  await migrateLegacyRoutineAssignments();

  await ensureExampleRoutineTemplates();
  })();

  return ensureRoutineSchemaPromise;
}

async function migrateLegacyRoutineAssignments() {
  const legacyRows = await sql`
    SELECT id, trainer_id, client_id, start_date
    FROM routines
    WHERE is_template = FALSE
      AND client_id IS NOT NULL
      AND active = TRUE
  ` as unknown as Array<{
    id: number;
    trainer_id: number;
    client_id: number;
    start_date: string | Date | null;
  }>;

  for (const row of legacyRows) {
    const existing = await sql`
      SELECT id
      FROM routine_assignments
      WHERE routine_id = ${row.id}
        AND client_id = ${row.client_id}
      LIMIT 1
    `;

    if (existing.length > 0) {
      continue;
    }

    await sql`
        INSERT INTO routine_assignments (
          routine_id,
          client_id,
          start_date,
          scope,
          template_visible,
          active
        )
        VALUES (
          ${row.id},
          ${row.client_id},
          ${row.start_date},
          'always',
          TRUE,
          TRUE
        )
      `;
  }
}

async function ensureExampleRoutineTemplates() {
  await sql`
    CREATE TABLE IF NOT EXISTS routine_example_seed_state (
      version TEXT PRIMARY KEY,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  const seedVersion = "2026-03-30-preloaded-routines-v1";
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
    ORDER BY id ASC
  `;

  if (trainerRows.length === 0) {
    return;
  }

  const templates: ExampleRoutineTemplate[] = [
    {
      name: "Rutina de Fuerza (3 días)",
      objective: "Desarrollo de fuerza máxima",
      level: "Intermedio-Avanzado",
      duration_weeks: 8,
      notes: "Rutina enfocada en mejorar la fuerza en los movimientos compuestos principales. Descansos de 2-3 minutos entre series.",
      days: [
        {
          day_number: 1,
          title: "Día 1: Sentadilla + Empuje",
          focus: "Fuerza inferior y pecho",
          notes: "Enfócate en técnica perfecta y progresión de carga.",
          exercises: [
            { exercise_key: "squat", name: "Sentadilla", sets: 5, reps: "5", rest_seconds: 180, notes: "Profundidad completa, espalda neutra" },
            { exercise_key: "bench_press", name: "Press banca", sets: 5, reps: "5", rest_seconds: 180, notes: "Control en la bajada, explosivo al subir" },
            { exercise_key: "row", name: "Remo con barra", sets: 3, reps: "8-10", rest_seconds: 120, notes: "Espalda recta, contraer escapulas" },
            { exercise_key: "leg_extension", name: "Extensión de cuádriceps", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Contracción máxima" },
            { exercise_key: "triceps_pushdown", name: "Pushdown tríceps", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Extensión completa" },
          ],
        },
        {
          day_number: 2,
          title: "Día 2: Peso muerto + Tirón",
          focus: "Fuerza posterior y espalda",
          notes: "Mantén la espalda neutral en el peso muerto.",
          exercises: [
            { exercise_key: "deadlift", name: "Peso muerto", sets: 5, reps: "3", rest_seconds: 180, notes: "Cadera atrás, barra cerca del cuerpo" },
            { exercise_key: "pull_up", name: "Dominadas", sets: 4, reps: "5-8", rest_seconds: 150, notes: "Agarre prono, pecho a la barra" },
            { exercise_key: "romanian_deadlift", name: "Peso muerto rumano", sets: 3, reps: "8-10", rest_seconds: 120, notes: "Estirar isquios, sin redondear espalda" },
            { exercise_key: "seated_row", name: "Remo sentado", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Contracción de espalda media" },
            { exercise_key: "biceps_curl", name: "Curl bíceps", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Sin balanceo, movimiento controlado" },
          ],
        },
        {
          day_number: 3,
          title: "Día 3: Press militar + Accesorios",
          focus: "Fuerza superior y estabilidad",
          notes: "Core firme en el press militar.",
          exercises: [
            { exercise_key: "overhead_press", name: "Press militar", sets: 5, reps: "5", rest_seconds: 180, notes: "Core apretado, sin arquear espalda" },
            { exercise_key: "front_squat", name: "Sentadilla frontal", sets: 3, reps: "6-8", rest_seconds: 150, notes: "Codos altos, torso vertical" },
            { exercise_key: "lat_pulldown", name: "Jalón al pecho", sets: 3, reps: "8-10", rest_seconds: 120, notes: "Agarre ancho, contraer dorsales" },
            { exercise_key: "lateral_raise", name: "Elevaciones laterales", sets: 3, reps: "12-15", rest_seconds: 90, notes: "Elevar hasta altura hombros" },
            { exercise_key: "plank", name: "Plancha", sets: 3, reps: "45-60s", rest_seconds: 60, notes: "Abdomen firme, cadera alineada" },
          ],
        },
      ],
    },
    {
      name: "Rutina de Hipertrofia (4 días)",
      objective: "Desarrollo muscular",
      level: "Intermedio",
      duration_weeks: 6,
      notes: "Rutina dividida para maximizar crecimiento muscular. Descansos de 60-90 segundos.",
      days: [
        {
          day_number: 1,
          title: "Día 1: Pecho + Tríceps",
          focus: "Empuje horizontal y extensión de codos",
          notes: "Concéntrate en la conexión mente-músculo.",
          exercises: [
            { exercise_key: "bench_press", name: "Press banca", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Control excéntrico 3 segundos" },
            { exercise_key: "incline_press", name: "Press inclinado", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Ángulo 30-45 grados" },
            { exercise_key: "cable_fly", name: "Cruce de poleas", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Apretar pecho al final" },
            { exercise_key: "triceps_pushdown", name: "Pushdown tríceps", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Codos pegados al cuerpo" },
            { exercise_key: "dips", name: "Fondos", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Inclinación adelante para pecho" },
          ],
        },
        {
          day_number: 2,
          title: "Día 2: Espalda + Bíceps",
          focus: "Tirón y flexión de codos",
          notes: "Retraer escápulas en cada repetición.",
          exercises: [
            { exercise_key: "pull_up", name: "Dominadas", sets: 4, reps: "6-8", rest_seconds: 90, notes: "Agarre supino para bíceps" },
            { exercise_key: "row", name: "Remo con barra", sets: 4, reps: "8-10", rest_seconds: 90, notes: "Pecho alto, espalda recta" },
            { exercise_key: "lat_pulldown", name: "Jalón al pecho", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Agarre prono, contraer dorsales" },
            { exercise_key: "biceps_curl", name: "Curl bíceps", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Sin balanceo, pico de contracción" },
            { exercise_key: "seated_row", name: "Remo sentado", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Mantener tensión constante" },
          ],
        },
        {
          day_number: 3,
          title: "Día 3: Piernas",
          focus: "Desarrollo completo de piernas",
          notes: "Calentar bien, priorizar técnica sobre peso.",
          exercises: [
            { exercise_key: "squat", name: "Sentadilla", sets: 4, reps: "8-10", rest_seconds: 120, notes: "Profundidad paralela o más" },
            { exercise_key: "leg_press", name: "Prensa", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Pies al ancho de hombros" },
            { exercise_key: "leg_extension", name: "Extensión de cuádriceps", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Pausa arriba 1 segundo" },
            { exercise_key: "leg_curl", name: "Curl femoral", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Contracción fuerte de isquios" },
            { exercise_key: "calf_raise", name: "Elevación de gemelos", sets: 4, reps: "15-20", rest_seconds: 45, notes: "Estiramiento completo" },
          ],
        },
        {
          day_number: 4,
          title: "Día 4: Hombros + Abdominales",
          focus: "Deltoides y core",
          notes: "Variedad de ángulos para hombros.",
          exercises: [
            { exercise_key: "overhead_press", name: "Press militar", sets: 4, reps: "8-10", rest_seconds: 90, notes: "De pie o sentado con apoyo" },
            { exercise_key: "lateral_raise", name: "Elevaciones laterales", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Controlar la bajada" },
            { exercise_key: "rear_delt_fly", name: "Pájaros", sets: 3, reps: "15-20", rest_seconds: 60, notes: "Deltoide posterior, pecho en banco" },
            { exercise_key: "russian_twist", name: "Russian twist", sets: 3, reps: "20", rest_seconds: 45, notes: "Rotación controlada" },
            { exercise_key: "dead_bug", name: "Dead bug", sets: 3, reps: "12 por lado", rest_seconds: 45, notes: "Mantener espalda pegada al suelo" },
          ],
        },
      ],
    },
    {
      name: "Rutina de Principiantes (3 días)",
      objective: "Adaptación y aprendizaje",
      level: "Principiante",
      duration_weeks: 4,
      notes: "Rutina full body para aprender técnica y crear hábito. Descansos de 60-90 segundos.",
      days: [
        {
          day_number: 1,
          title: "Full Body A",
          focus: "Movimientos básicos",
          notes: "Enfócate en técnica, no en peso.",
          exercises: [
            { exercise_key: "squat", name: "Sentadilla", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Con barra vacía o peso corporal" },
            { exercise_key: "bench_press", name: "Press banca", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Con barra vacía o mancuernas ligeras" },
            { exercise_key: "row", name: "Remo con barra", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Espalda recta, contraer escapulas" },
            { exercise_key: "plank", name: "Plancha", sets: 3, reps: "30s", rest_seconds: 45, notes: "Forma correcta" },
            { exercise_key: "walk", name: "Caminata", sets: 1, reps: "10 min", rest_seconds: 0, notes: "Ritmo moderado para activación" },
          ],
        },
        {
          day_number: 2,
          title: "Full Body B",
          focus: "Variación de patrones",
          notes: "Mantén intensidad moderada.",
          exercises: [
            { exercise_key: "leg_press", name: "Prensa", sets: 3, reps: "12-15", rest_seconds: 90, notes: "Pies cómodos, no bloquear rodillas" },
            { exercise_key: "overhead_press", name: "Press militar", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Con barra vacía o mancuernas" },
            { exercise_key: "lat_pulldown", name: "Jalón al pecho", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Agarre ancho, controlado" },
            { exercise_key: "glute_bridge", name: "Puente glúteo", sets: 3, reps: "15", rest_seconds: 60, notes: "Apretar glúteos en la parte alta" },
            { exercise_key: "bike", name: "Bicicleta", sets: 1, reps: "10 min", rest_seconds: 0, notes: "Ritmo suave" },
          ],
        },
        {
          day_number: 3,
          title: "Full Body C",
          focus: "Estabilidad y movilidad",
          notes: "Enfasis en control y rango de movimiento.",
          exercises: [
            { exercise_key: "romanian_deadlift", name: "Peso muerto rumano", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Con barra ligera o mancuernas" },
            { exercise_key: "push_up", name: "Flexiones", sets: 3, reps: "8-12", rest_seconds: 90, notes: "Rodillas si es necesario" },
            { exercise_key: "seated_row", name: "Remo sentado", sets: 3, reps: "10-12", rest_seconds: 90, notes: "Espalda recta, sin balanceo" },
            { exercise_key: "russian_twist", name: "Russian twist", sets: 3, reps: "15", rest_seconds: 45, notes: "Sin peso, rotación controlada" },
            { exercise_key: "stretch_flow", name: "Movilidad", sets: 1, reps: "5 min", rest_seconds: 0, notes: "Estiramientos dinámicos" },
          ],
        },
      ],
    },
    {
      name: "Rutina de Mantenimiento (3 días)",
      objective: "Mantener condición física",
      level: "Intermedio",
      duration_weeks: 12,
      notes: "Rutina equilibrada para mantener masa muscular y condición cardiovascular.",
      days: [
        {
          day_number: 1,
          title: "Circuito Superior",
          focus: "Torso completo",
          notes: "Circuito con poco descanso entre ejercicios.",
          exercises: [
            { exercise_key: "bench_press", name: "Press banca", sets: 3, reps: "8-10", rest_seconds: 60, notes: "Intensidad moderada" },
            { exercise_key: "row", name: "Remo con barra", sets: 3, reps: "8-10", rest_seconds: 60, notes: "Contraer espalda" },
            { exercise_key: "overhead_press", name: "Press militar", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Controlado" },
            { exercise_key: "lat_pulldown", name: "Jalón al pecho", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Sin impulso" },
            { exercise_key: "plank", name: "Plancha", sets: 3, reps: "45s", rest_seconds: 30, notes: "Forma perfecta" },
          ],
        },
        {
          day_number: 2,
          title: "Circuito Inferior",
          focus: "Piernas y core",
          notes: "Enfoque en resistencia muscular.",
          exercises: [
            { exercise_key: "squat", name: "Sentadilla", sets: 3, reps: "10-12", rest_seconds: 60, notes: "Peso moderado" },
            { exercise_key: "leg_press", name: "Prensa", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Rango completo" },
            { exercise_key: "leg_curl", name: "Curl femoral", sets: 3, reps: "12-15", rest_seconds: 60, notes: "Contracción lenta" },
            { exercise_key: "glute_bridge", name: "Puente glúteo", sets: 3, reps: "15", rest_seconds: 45, notes: "Apretar glúteos" },
            { exercise_key: "calf_raise", name: "Elevación de gemelos", sets: 3, reps: "15-20", rest_seconds: 45, notes: "Estiramiento completo" },
          ],
        },
        {
          day_number: 3,
          title: "Circuito Cardio y Core",
          focus: "Condición y estabilidad",
          notes: "Circuito mixto, mantener ritmo constante.",
          exercises: [
            { exercise_key: "bike", name: "Bicicleta", sets: 3, reps: "5 min", rest_seconds: 60, notes: "Ritmo moderado-alto" },
            { exercise_key: "mountain_climbers", name: "Mountain climbers", sets: 3, reps: "45s", rest_seconds: 30, notes: "Ritmo rápido" },
            { exercise_key: "russian_twist", name: "Russian twist", sets: 3, reps: "20", rest_seconds: 30, notes: "Con peso ligero" },
            { exercise_key: "rope_jump", name: "Saltar cuerda", sets: 3, reps: "2 min", rest_seconds: 60, notes: "Ritmo constante" },
            { exercise_key: "dead_bug", name: "Dead bug", sets: 3, reps: "12 por lado", rest_seconds: 30, notes: "Control lumbo-pélvico" },
          ],
        },
      ],
    },
    {
      name: "Rutina de Definición (4 días)",
      objective: "Pérdida de grasa y preservación muscular",
      level: "Intermedio-Avanzado",
      duration_weeks: 8,
      notes: "Rutina combinada con énfasis en intensidad y volumen moderado-alto. Incluye cardio.",
      days: [
        {
          day_number: 1,
          title: "Fuerza Metabólica - Superior",
          focus: "Alta intensidad, poco descanso",
          notes: "Supersets para mantener ritmo cardíaco alto.",
          exercises: [
            { exercise_key: "bench_press", name: "Press banca", sets: 4, reps: "8-10", rest_seconds: 60, notes: "Superset con remo" },
            { exercise_key: "row", name: "Remo con barra", sets: 4, reps: "8-10", rest_seconds: 60, notes: "Superset con press banca" },
            { exercise_key: "overhead_press", name: "Press militar", sets: 3, reps: "10-12", rest_seconds: 45, notes: "Circuito" },
            { exercise_key: "lat_pulldown", name: "Jalón al pecho", sets: 3, reps: "10-12", rest_seconds: 45, notes: "Circuito" },
            { exercise_key: "battle_ropes", name: "Battle ropes", sets: 3, reps: "30s", rest_seconds: 30, notes: "Alta intensidad" },
          ],
        },
        {
          day_number: 2,
          title: "Cardio HIIT",
          focus: "Quema de grasa",
          notes: "Intervalos de alta intensidad.",
          exercises: [
            { exercise_key: "bike", name: "Bicicleta", sets: 8, reps: "30s sprint, 60s descanso", rest_seconds: 60, notes: "Máxima intensidad en sprints" },
            { exercise_key: "burpees", name: "Burpees", sets: 4, reps: "10", rest_seconds: 45, notes: "Técnica completa" },
            { exercise_key: "mountain_climbers", name: "Mountain climbers", sets: 4, reps: "45s", rest_seconds: 30, notes: "Ritmo rápido" },
            { exercise_key: "rope_jump", name: "Saltar cuerda", sets: 5, reps: "1 min", rest_seconds: 30, notes: "Ritmo constante" },
          ],
        },
        {
          day_number: 3,
          title: "Fuerza Metabólica - Inferior",
          focus: "Piernas y core con poco descanso",
          notes: "Ejercicios compuestos, mantener intensidad.",
          exercises: [
            { exercise_key: "squat", name: "Sentadilla", sets: 4, reps: "10-12", rest_seconds: 60, notes: "Superset con peso muerto rumano" },
            { exercise_key: "romanian_deadlift", name: "Peso muerto rumano", sets: 4, reps: "10-12", rest_seconds: 60, notes: "Superset con sentadilla" },
            { exercise_key: "leg_press", name: "Prensa", sets: 3, reps: "15-20", rest_seconds: 45, notes: "Alto volumen" },
            { exercise_key: "leg_curl", name: "Curl femoral", sets: 3, reps: "15-20", rest_seconds: 45, notes: "Contracción lenta" },
            { exercise_key: "plank", name: "Plancha", sets: 4, reps: "60s", rest_seconds: 30, notes: "Mantener forma" },
          ],
        },
        {
          day_number: 4,
          title: "Cardio LISS + Core",
          focus: "Quema de grasa en estado estable",
          notes: "Cardio de baja intensidad y trabajo de core.",
          exercises: [
            { exercise_key: "walk", name: "Caminata", sets: 1, reps: "30-40 min", rest_seconds: 0, notes: "Ritmo constante, zona de quema de grasa" },
            { exercise_key: "russian_twist", name: "Russian twist", sets: 4, reps: "20", rest_seconds: 30, notes: "Con peso ligero" },
            { exercise_key: "dead_bug", name: "Dead bug", sets: 3, reps: "15 por lado", rest_seconds: 30, notes: "Control total" },
            { exercise_key: "crunch", name: "Crunch", sets: 3, reps: "20", rest_seconds: 30, notes: "Contracción abdominal" },
          ],
        },
      ],
    },
  ];

  // Use a single transaction for all inserts
  await sql.begin(async (tx) => {
    const trx = tx as any;

    for (const trainer of trainerRows) {
      const trainerId = trainer.id as number;

      for (const template of templates) {
        // Check if template already exists for this trainer
        const existingRoutine = await trx`
          SELECT id
          FROM routines
          WHERE trainer_id = ${trainerId}
            AND name = ${template.name}
            AND is_template = TRUE
          LIMIT 1
        `;

        if (existingRoutine.length > 0) {
          continue;
        }

        // Insert routine
        const routineRows = await trx`
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

        // Insert days and exercises
        for (const day of template.days) {
          const dayRows = await trx`
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

          // Insert exercises one by one (small number, acceptable)
          for (let position = 0; position < day.exercises.length; position += 1) {
            const exercise = day.exercises[position];
            await trx`
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
    }

    // Insert seed state within the same transaction
    await trx`
      INSERT INTO routine_example_seed_state (version)
      VALUES (${seedVersion})
    `;
  });
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
      (SELECT COUNT(*) FROM routine_assignments ra WHERE ra.routine_id = r.id AND ra.active = TRUE)::int AS assigned_clients_total,
      r.name,
      r.objective,
      r.level,
      r.duration_weeks,
      r.notes,
      r.is_template,
      r.start_date,
      r.active,
      r.created_at,
      (SELECT COUNT(*) FROM routine_days rd WHERE rd.routine_id = r.id)::int AS days_total,
      (SELECT COUNT(*) FROM routine_exercises re 
        INNER JOIN routine_days rd ON re.routine_day_id = rd.id 
        WHERE rd.routine_id = r.id)::int AS exercises_total
    FROM routines r
    LEFT JOIN clients c ON c.id = r.client_id
    ${userFilter}
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

async function fetchRoutineBaseById(routineId: number) {
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
    LIMIT 1
  `;

  return (rows[0] as RoutineRow | undefined) ?? null;
}

export async function getRoutineAssignmentsForRoutine(routineId: number, user: RoutineUser) {
  const accessFilter =
    user.role === "admin"
      ? sql``
      : user.role === "trainer"
        ? sql`AND r.trainer_id = ${user.id}`
        : sql`AND 1 = 0`;

  const rows = await sql`
    SELECT
      a.id,
      a.routine_id,
      a.client_id,
      c.full_name AS client_name,
      a.start_date,
      a.active,
      a.time_slot,
      a.notes,
      a.created_at
    FROM routine_assignments a
    INNER JOIN routines r ON r.id = a.routine_id
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.routine_id = ${routineId}
    ${accessFilter}
    ORDER BY a.active DESC, a.created_at DESC, a.id DESC
  `;

  return rows as unknown as RoutineAssignment[];
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
      re.image_url,
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
    image_url: string | null;
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
        imageUrl: row.image_url,
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
  const assignmentRows = await sql`
    SELECT
      a.id,
      a.routine_id,
      a.client_id,
      a.start_date,
      a.time_slot,
      a.notes,
      a.active,
      r.trainer_id,
      r.name,
      r.objective,
      r.level,
      r.duration_weeks,
      r.notes AS routine_notes,
      r.is_template,
      r.active AS routine_active,
      r.created_at,
      c.full_name AS client_name
    FROM routine_assignments a
    INNER JOIN routines r ON r.id = a.routine_id
    LEFT JOIN clients c ON c.id = a.client_id
    WHERE a.client_id = ${clientId}
      AND a.active = TRUE
      AND r.active = TRUE
      AND (
        a.scope = 'always'
        OR (a.scope = 'today' AND a.start_date = CURRENT_DATE)
        OR (a.scope = 'week' AND a.start_date IS NOT NULL AND a.start_date >= CURRENT_DATE AND a.start_date < CURRENT_DATE + INTERVAL '7 days')
      )
    ORDER BY a.created_at DESC, a.id DESC
    LIMIT 1
  ` as unknown as Array<{
    id: number;
    routine_id: number;
    client_id: number;
    start_date: string | Date | null;
    scope: "today" | "week" | "always";
    time_slot: RoutineAttendanceTimeSlot | null;
    notes: string | null;
    active: boolean;
    trainer_id: number;
    name: string;
    objective: string | null;
    level: string | null;
    duration_weeks: number | null;
    routine_notes: string | null;
    is_template: boolean;
    routine_active: boolean;
    created_at: string | Date | null;
    client_name: string | null;
  }>;

  const assignment = assignmentRows[0];
  let base: RoutineRow | null = null;

  if (assignment) {
    base = {
      id: assignment.routine_id,
      trainer_id: assignment.trainer_id,
      client_id: assignment.client_id,
      client_name: assignment.client_name,
      client_email: null,
      name: assignment.name,
      objective: assignment.objective,
      level: assignment.level,
      duration_weeks: assignment.duration_weeks,
      notes: assignment.routine_notes,
      is_template: assignment.is_template,
      start_date: assignment.start_date,
      active: assignment.routine_active,
      created_at: assignment.created_at,
    };
  }

  if (!base) {
    const legacyRows = await sql`
      SELECT
        r.id,
        r.trainer_id,
        r.client_id,
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
      WHERE r.client_id = ${clientId}
        AND r.is_template = FALSE
        AND r.active = TRUE
      ORDER BY r.created_at DESC, r.id DESC
      LIMIT 1
    `;

    const legacyRoutineId = legacyRows[0]?.id as number | undefined;

    if (!legacyRoutineId) {
      return null;
    }

    const legacyBase = await fetchRoutineBaseById(legacyRoutineId);

    if (!legacyBase) {
      return null;
    }

    base = legacyBase;
  }

  base.client_id = clientId;

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
      re.image_url,
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
    WHERE rd.routine_id = ${base.id}
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
    image_url: string | null;
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
        imageUrl: row.image_url,
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
