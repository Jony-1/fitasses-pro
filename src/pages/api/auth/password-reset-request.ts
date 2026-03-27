import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensurePasswordResetSchema, createPasswordResetToken } from "../../../lib/auth/password-reset";
import { normalizeEmail, isValidEmail } from "../../../lib/utils/validation";

export const POST: APIRoute = async ({ request, redirect }) => {
  await ensurePasswordResetSchema();

  const formData = await request.formData();
  const email = normalizeEmail(formData.get("email"));

  if (!email || !isValidEmail(email)) {
    return redirect("/forgot-password?status=sent");
  }

  const users = await sql`
    SELECT id
    FROM users
    WHERE email = ${email}
    LIMIT 1
  ` as Array<{ id: number }>;

  if (users.length === 0) {
    return redirect("/forgot-password?status=sent");
  }

  const { token } = await createPasswordResetToken(users[0].id);
  const resetPath = `/reset-password/${token}`;

  return redirect(`/forgot-password?status=sent&reset_path=${encodeURIComponent(resetPath)}`);
};
