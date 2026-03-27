import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import {
  createExerciseImageData,
  ensureExerciseSchema,
  exerciseLibrary,
  generateExerciseKey,
} from "../../../lib/utils/exercise-library";

function parseFormData(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    key: String(formData.get("key") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    category: String(formData.get("category") ?? "").trim(),
    muscle: String(formData.get("muscle") ?? "").trim(),
    equipment: String(formData.get("equipment") ?? "").trim(),
    accent: String(formData.get("accent") ?? "").trim() || "#14b8a6",
    glyph: String(formData.get("glyph") ?? "").trim().toUpperCase() || "FX",
    imageUrl: String(formData.get("image_url") ?? "").trim() || null,
    videoUrl: String(formData.get("video_url") ?? "").trim() || null,
  };
}

function hasStaticKey(key: string) {
  return exerciseLibrary.some((exercise) => exercise.key === key);
}

async function ensureUniqueKey(baseKey: string) {
  const normalized = generateExerciseKey(baseKey);
  const candidates = [normalized];

  for (let index = 2; index < 50; index += 1) {
    candidates.push(`${normalized}-${index}`);
  }

  for (const candidate of candidates) {
    const rows = await sql`
      SELECT 1
      FROM exercise_library_items
      WHERE key = ${candidate}
      LIMIT 1
    `;

    if (rows.length === 0 && !hasStaticKey(candidate)) {
      return candidate;
    }
  }

  return `${normalized}-${Date.now()}`;
}

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  if (user.role !== "trainer" && user.role !== "admin") {
    return redirect("/login?error=forbidden");
  }

  await ensureExerciseSchema();

  const data = parseFormData(await request.formData());
  const isAdmin = user.role === "admin";

  if (!data.name || !data.category || !data.muscle || !data.equipment) {
    return redirect("/exercises?error=missing_fields");
  }

  let key = data.key;
  if (!key) {
    key = isAdmin ? await ensureUniqueKey(data.name) : generateExerciseKey(data.name);
  }

  if (isAdmin && hasStaticKey(key)) {
    key = await ensureUniqueKey(data.name);
  }

  const imageUrl = String(data.imageUrl ?? "").trim().length > 0 ? String(data.imageUrl).trim() : null;

  if (isAdmin) {
    if (data.id) {
    await sql`
      UPDATE exercise_library_items
      SET
        name = ${data.name},
        category = ${data.category},
        muscle = ${data.muscle},
        equipment = ${data.equipment},
        image_url = ${imageUrl},
        video_url = ${data.videoUrl},
        accent = ${data.accent},
        glyph = ${data.glyph},
        updated_at = NOW()
      WHERE id = ${Number(data.id)}
    `;
    } else {
    await sql`
      INSERT INTO exercise_library_items (
        key,
        name,
        category,
        muscle,
        equipment,
        image_url,
        video_url,
        accent,
        glyph,
        is_custom
      )
      VALUES (
        ${key},
        ${data.name},
        ${data.category},
        ${data.muscle},
        ${data.equipment},
        ${imageUrl},
        ${data.videoUrl},
        ${data.accent},
        ${data.glyph},
        TRUE
      )
    `;
    }
  } else {
    await sql`
      INSERT INTO trainer_exercise_overrides (
        trainer_id,
        exercise_key,
        name,
        category,
        muscle,
        equipment,
        image_url,
        video_url,
        accent,
        glyph
      )
      VALUES (
        ${user.id},
        ${key},
        ${data.name},
        ${data.category},
        ${data.muscle},
        ${data.equipment},
        ${imageUrl},
        ${data.videoUrl},
        ${data.accent},
        ${data.glyph}
      )
      ON CONFLICT (trainer_id, exercise_key)
      DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        muscle = EXCLUDED.muscle,
        equipment = EXCLUDED.equipment,
        image_url = EXCLUDED.image_url,
        video_url = EXCLUDED.video_url,
        accent = EXCLUDED.accent,
        glyph = EXCLUDED.glyph,
        updated_at = NOW()
    `;
  }

  return redirect("/exercises?status=success");
};
