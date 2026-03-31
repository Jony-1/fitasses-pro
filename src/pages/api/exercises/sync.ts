import type { APIRoute } from "astro";
import { syncExerciseCatalogFromWger } from "../../../lib/utils/exercise-library";

export const POST: APIRoute = async ({ locals, redirect }) => {
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "admin" && user.role !== "trainer" && user.role !== "gym_manager") {
    return redirect("/login?error=forbidden");
  }

  await syncExerciseCatalogFromWger(true);

  return redirect("/exercises?status=sync-complete");
};
