import type { APIRoute } from "astro";
import { sql } from "../../lib/db/client";
import fs from "fs";
import path from "path";

export const GET: APIRoute = async () => {

  const filePath = path.resolve("src/lib/db/schema.sql");
  const schema = fs.readFileSync(filePath, "utf8");

  await sql.unsafe(schema);

  return new Response(
    JSON.stringify({
      status: "database initialized"
    }),
    { status: 200 }
  );
};