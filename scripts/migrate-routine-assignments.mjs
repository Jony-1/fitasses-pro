import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres(process.env.DATABASE_URL, { ssl: false });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS routine_assignments (
      id SERIAL PRIMARY KEY,
      routine_id INTEGER NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
      client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
      start_date DATE,
      scope TEXT NOT NULL DEFAULT 'always' CHECK (scope IN ('today', 'week', 'always')),
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

  const legacyRows = await sql`
    SELECT id, client_id, start_date
    FROM routines
    WHERE is_template = FALSE
      AND client_id IS NOT NULL
      AND active = TRUE
  `;

  let inserted = 0;

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
      INSERT INTO routine_assignments (routine_id, client_id, start_date, scope, active)
      VALUES (${row.id}, ${row.client_id}, ${row.start_date}, 'always', TRUE)
    `;
    inserted += 1;
  }

  console.log(`Migrated ${inserted} legacy assignments.`);
}

main()
  .then(async () => {
    await sql.end({ timeout: 5 });
  })
  .catch(async (error) => {
    console.error(error);
    await sql.end({ timeout: 5 });
    process.exit(1);
  });
