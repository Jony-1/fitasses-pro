import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString =
  import.meta.env.DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const client = postgres(connectionString, {
  ssl: false,
});

export const sql = client;
export const db = drizzle(client);
