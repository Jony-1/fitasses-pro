CREATE TABLE IF NOT EXISTS gyms (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'gym_manager', 'trainer', 'client')),
    gym_id INTEGER REFERENCES gyms(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    birth_date DATE,
    height_m NUMERIC(5, 2),
    notes TEXT,
    gender TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS client_conditions (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS assessments (
    id SERIAL PRIMARY KEY,  
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    assessment_date DATE NOT NULL,
    weight_kg NUMERIC(5, 2),
    body_fat_pct NUMERIC(5, 2),
    muscle_pct NUMERIC(5, 2),
    daily_calories INTEGER,
    metabolic_age INTEGER,
    visceral_fat INTEGER,
    bmi NUMERIC(5, 2),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
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
);
CREATE TABLE IF NOT EXISTS routine_days (
    id SERIAL PRIMARY KEY,
    routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    focus TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (routine_id, day_number)
);
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
);
CREATE TABLE IF NOT EXISTS routine_day_completions (
    id SERIAL PRIMARY KEY,
    routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    completed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE (routine_day_id, client_id)
);
CREATE TABLE IF NOT EXISTS routine_day_attendances (
    id SERIAL PRIMARY KEY,
    routine_day_id INTEGER NOT NULL REFERENCES routine_days(id) ON DELETE CASCADE,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('going', 'not_going')),
    time_slot TEXT NOT NULL DEFAULT 'other' CHECK (time_slot IN ('morning', 'midday', 'night', 'other')),
    checked_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    UNIQUE (routine_day_id, client_id)
);
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
);
CREATE TABLE IF NOT EXISTS assessment_measurements (
    id SERIAL PRIMARY KEY,
    assessment_id INTEGER REFERENCES assessments(id) ON DELETE CASCADE,
    shoulders_cm NUMERIC(5, 2),
    chest_cm NUMERIC(5, 2),
    right_arm_cm NUMERIC(5, 2),
    waist_cm NUMERIC(5, 2),
    hips_cm NUMERIC(5, 2),
    right_thigh_cm NUMERIC(5, 2),
    calf_cm NUMERIC(5, 2)
);
ALTER TABLE clients
ADD COLUMN IF NOT EXISTS user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE
SET NULL;

INSERT INTO gyms (name)
SELECT 'Gimnasio principal'
WHERE NOT EXISTS (
    SELECT 1 FROM gyms
);

UPDATE users
SET gym_id = COALESCE(gym_id, (SELECT id FROM gyms ORDER BY id ASC LIMIT 1))
WHERE role IN ('gym_manager', 'trainer', 'client')
  AND gym_id IS NULL;
