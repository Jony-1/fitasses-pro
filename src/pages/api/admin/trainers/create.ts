import type { APIRoute } from "astro";
import { requireAdminOrGymManager } from "../../../../lib/auth/guards";
import { hashPassword } from "../../../../lib/auth/password";
import { sql } from "../../../../lib/db/client";
import { isStrongPassword } from "../../../../lib/utils/validation";

export const POST: APIRoute = async (context) => {
    try {
        const user = requireAdminOrGymManager(context);

        const formData = await context.request.formData();

        const name = String(formData.get("name") || "").trim();
        const email = String(formData.get("email") || "")
            .trim()
            .toLowerCase();
        const password = String(formData.get("password") || "").trim();
        const roleRaw = String(formData.get("role") || "trainer").trim();
        const gymIdRaw = String(formData.get("gym_id") || "").trim();
        const role = roleRaw === "gym_manager" ? "gym_manager" : "trainer";

        if (!name || !email || !password) {
            return context.redirect(
                "/admin/trainers?status=error&message=Todos%20los%20campos%20son%20obligatorios",
            );
        }

        if (!isStrongPassword(password)) {
            return context.redirect(
                "/admin/trainers?status=error&message=La%20contraseña%20debe%20tener%20al%20menos%208%20caracteres,%20una%20mayúscula%20y%20un%20número",
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

        const gymId = user.role === "admin" ? Number(gymIdRaw) : user.gymId ?? null;

        if (!gymId || Number.isNaN(gymId)) {
            return context.redirect(
                "/admin/trainers?status=error&message=Selecciona%20un%20gimnasio%20válido",
            );
        }

        if (user.role === "admin") {
            const gymRows = await sql`
                SELECT id
                FROM gyms
                WHERE id = ${gymId}
                LIMIT 1
            `;

            if (gymRows.length === 0) {
                return context.redirect(
                    "/admin/trainers?status=error&message=Gimnasio%20no%20encontrado",
                );
            }
        }

        const passwordHash = await hashPassword(password);

        await sql`
      INSERT INTO users (name, email, password_hash, role, gym_id)
      VALUES (${name}, ${email}, ${passwordHash}, ${role}, ${gymId})
    `;

        return context.redirect(
            `/admin/trainers?status=success&message=${encodeURIComponent(`Usuario creado correctamente: ${name} (${email}).`)}`,
        );
    } catch (error) {
        console.error("Create trainer error:", error);

        return context.redirect(
            "/admin/trainers?status=error&message=No%20se%20pudo%20crear%20el%20trainer",
        );
    }
};
