import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = import.meta.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

export const sql = postgres(connectionString, {
  ssl: "require"
});


const client = postgres(connectionString);

export const db = drizzle(client);
