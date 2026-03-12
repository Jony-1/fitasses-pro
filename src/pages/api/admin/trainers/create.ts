import type { APIRoute } from "astro";
import { requireAdmin } from "../../../../lib/auth/guards";
import { hashPassword } from "../../../../lib/auth/password";
import { sql } from "../../../../lib/db/client";

export const POST: APIRoute = async (context) => {
    try {
        requireAdmin(context);

        const formData = await context.request.formData();

        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();
        const password = String(formData.get("password") || "").trim();

        if (!name || !email || !password) {
            return context.redirect(
                "/admin/trainers?status=error&message=Todos%20los%20campos%20son%20obligatorios",
            );
        }

        if (password.length < 6) {
            return context.redirect(
                "/admin/trainers?status=error&message=La%20contraseña%20debe%20tener%20mínimo%206%20caracteres",
            );
        }

        const existingUser = await sql`
      SELECT id
      FROM users
      WHERE email = ${email}
      LIMIT 1
    `;

        if (existingUser.length > 0) {
            return context.redirect(
                "/admin/trainers?status=error&message=Ya%20existe%20un%20usuario%20con%20ese%20correo",
            );
        }

        const passwordHash = await hashPassword(password);

        await sql`
      INSERT INTO users (name, email, password_hash, role)
      VALUES (${name}, ${email}, ${passwordHash}, 'trainer')
    `;

        return context.redirect(
            "/admin/trainers?status=success&message=Trainer%20creado%20correctamente",
        );
    } catch (error) {
        console.error("Create trainer error:", error);

        return context.redirect(
            "/admin/trainers?status=error&message=No%20se%20pudo%20crear%20el%20trainer",
        );
    }
};