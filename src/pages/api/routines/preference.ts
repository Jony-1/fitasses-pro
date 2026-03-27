import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import { ensureRoutineSchema } from "../../../lib/utils/routines";

export const POST: APIRoute = async ({ request, redirect, locals }) => {
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const routineId = Number(String(formData.get("routine_id") ?? "").trim());
  const clientId = Number(String(formData.get("client_id") ?? "").trim());
  const timeSlot = String(formData.get("time_slot") ?? "").trim() || null;
  const scopeValue = String(formData.get("scope") ?? "always").trim();
  const scope = ["today", "week", "always"].includes(scopeValue) ? scopeValue : "always";
  const startDate = scope === "always" ? null : new Date().toISOString().slice(0, 10);

  if (Number.isNaN(routineId) || Number.isNaN(clientId)) {
    return redirect("/routines?status=error&message=Datos%20inválidos");
  }

  const assignmentRows = await sql`
    SELECT a.id
    FROM routine_assignments a
    INNER JOIN routines r ON r.id = a.routine_id
    WHERE a.routine_id = ${routineId}
      AND a.client_id = ${clientId}
      AND a.active = TRUE
      ${user.role === "trainer" ? sql`AND r.trainer_id = ${user.id}` : sql``}
      ${user.role === "client" ? sql`AND EXISTS (SELECT 1 FROM clients c WHERE c.id = a.client_id AND c.user_id = ${user.id})` : sql``}
    LIMIT 1
  ` as Array<{ id: number }>;

  if (assignmentRows.length === 0 && user.role !== "admin") {
    return redirect(`/clients/${clientId}/routine?status=error&message=Asignación%20no%20encontrada`);
  }

  await sql`
    UPDATE routine_assignments
    SET time_slot = ${timeSlot},
        scope = ${scope},
        start_date = ${startDate},
        updated_at = NOW()
    WHERE routine_id = ${routineId}
      AND client_id = ${clientId}
      AND active = TRUE
  `;

  return redirect(`/clients/${clientId}/routine?status=success&message=Preferencia%20guardada`);
};
