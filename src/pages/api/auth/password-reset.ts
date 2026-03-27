import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensurePasswordResetSchema, consumePasswordResetToken } from "../../../lib/auth/password-reset";
import { hashPassword } from "../../../lib/auth/password";
import { isStrongPassword } from "../../../lib/utils/validation";

export const POST: APIRoute = async ({ request, redirect }) => {
  await ensurePasswordResetSchema();

  const formData = await request.formData();
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  if (!token || !password || !confirmPassword) {
    return redirect(`/reset-password/${encodeURIComponent(token)}?error=missing_fields`);
  }

  if (password !== confirmPassword) {
    return redirect(`/reset-password/${encodeURIComponent(token)}?error=password_mismatch`);
  }

  if (!isStrongPassword(password)) {
    return redirect(`/reset-password/${encodeURIComponent(token)}?error=weak_password`);
  }

  const resetToken = await consumePasswordResetToken(token);

  if (!resetToken) {
    return redirect(`/reset-password/${encodeURIComponent(token)}?error=invalid_token`);
  }

  const passwordHash = await hashPassword(password);

  await sql`
    UPDATE users
    SET password_hash = ${passwordHash}
    WHERE id = ${resetToken.userId}
  `;

  await sql`
    DELETE FROM sessions
    WHERE user_id = ${resetToken.userId}
  `;

  return redirect("/login?status=success&message=Contraseña%20actualizada%20correctamente");
};
