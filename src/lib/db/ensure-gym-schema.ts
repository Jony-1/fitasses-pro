import { sql } from "./client";

let ensureGymSchemaPromise: Promise<void> | null = null;

async function ensureTableAndColumn() {
    await sql`
        CREATE TABLE IF NOT EXISTS gyms (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            invite_code TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;

    await sql`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'gyms'
                  AND column_name = 'invite_code'
            ) THEN
                ALTER TABLE gyms ADD COLUMN invite_code TEXT;
            END IF;
        END $$;
    `;

    await sql`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_name = 'users'
                  AND column_name = 'gym_id'
            ) THEN
                ALTER TABLE users ADD COLUMN gym_id INTEGER;
            END IF;
        END $$;
    `;

    await sql`
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'users_gym_id_fkey'
            ) THEN
                ALTER TABLE users
                ADD CONSTRAINT users_gym_id_fkey
                FOREIGN KEY (gym_id) REFERENCES gyms(id) ON DELETE SET NULL;
            END IF;
        END $$;
    `;

    await sql`
        INSERT INTO gyms (name)
        SELECT 'Gimnasio principal'
        WHERE NOT EXISTS (
            SELECT 1 FROM gyms
        )
    `;

    await sql`
        UPDATE gyms
        SET invite_code = COALESCE(
            invite_code,
            lower(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8))
        )
        WHERE invite_code IS NULL
    `;

    await sql`
        UPDATE users
        SET gym_id = COALESCE(gym_id, (SELECT id FROM gyms ORDER BY id ASC LIMIT 1))
        WHERE role IN ('gym_manager', 'trainer', 'client')
          AND gym_id IS NULL
    `;

    await sql`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token_hash TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            used_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT NOW()
        )
    `;

    await sql`CREATE INDEX IF NOT EXISTS password_reset_tokens_user_id_idx ON password_reset_tokens (user_id, created_at DESC)`;
}

export function ensureGymSchema() {
    if (!ensureGymSchemaPromise) {
        ensureGymSchemaPromise = ensureTableAndColumn().catch((error) => {
            ensureGymSchemaPromise = null;
            throw error;
        });
    }

    return ensureGymSchemaPromise;
}
