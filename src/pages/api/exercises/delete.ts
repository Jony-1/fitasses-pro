import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureExerciseSchema } from "../../../lib/utils/exercise-library";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "trainer" && user.role !== "admin") {
    return redirect("/login?error=forbidden");
  }

  await ensureExerciseSchema();

  const formData = await request.formData();
  const id = Number(String(formData.get("id") ?? "").trim());

  if (Number.isNaN(id)) {
    return redirect("/exercises?error=invalid_id");
  }

  await sql`
    DELETE FROM exercise_library_items
    WHERE id = ${id}
  `;

  return redirect("/exercises?status=deleted");
};
