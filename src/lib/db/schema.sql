CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'trainer', 'client')),
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