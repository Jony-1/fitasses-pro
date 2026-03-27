import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureExerciseSchema, invalidateExerciseCatalogCache } from "../../../lib/utils/exercise-library";

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
  const key = String(formData.get("key") ?? "").trim();

  if (Number.isNaN(id) && !key) {
    return redirect("/exercises?error=invalid_id");
  }

  if (user.role === "admin") {
    await sql`
      DELETE FROM exercise_library_items
      WHERE id = ${id}
    `;
  } else {
    if (!Number.isNaN(id)) {
      await sql`
        DELETE FROM trainer_exercise_overrides
        WHERE trainer_id = ${user.id}
          AND id = ${id}
      `;
    } else {
      await sql`
        DELETE FROM trainer_exercise_overrides
        WHERE trainer_id = ${user.id}
          AND exercise_key = ${key}
      `;
    }
  }

  invalidateExerciseCatalogCache();

  return redirect("/exercises?status=deleted");
};
