import type { APIRoute } from "astro";
import { sql } from "../../../lib/db/client";
import {
  ensureRoutineSchema,
  getAccessibleClientIdForUser,
  type RoutineAttendanceTimeSlot,
} from "../../../lib/utils/routines";

const ALLOWED_TIME_SLOTS: RoutineAttendanceTimeSlot[] = ["morning", "midday", "night", "other"];

function getTimeSlotLabel(timeSlot: RoutineAttendanceTimeSlot) {
  switch (timeSlot) {
    case "morning":
      return "mañana";
    case "midday":
      return "mediodía";
    case "night":
      return "noche";
    default:
      return "otro horario";
  }
}

export const POST: APIRoute = async (context) => {
  const { request, redirect, locals } = context;
  const user = locals.user;

  if (!user) {
    return redirect("/login");
  }

  await ensureRoutineSchema();

  const formData = await request.formData();
  const routineDayId = Number(String(formData.get("routine_day_id") ?? "").trim());
  const status = String(formData.get("status") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const clientIdRaw = String(formData.get("client_id") ?? "").trim();
  const timeSlot = String(formData.get("time_slot") ?? "other").trim() as RoutineAttendanceTimeSlot;

  if (
    Number.isNaN(routineDayId) ||
    (status !== "going" && status !== "not_going") ||
    !ALLOWED_TIME_SLOTS.includes(timeSlot)
  ) {
    return redirect("/clients?status=error&message=Datos%20inválidos");
  }

  const dayRows = await sql`
    SELECT
      rd.id,
      rd.routine_id,
      r.trainer_id
    FROM routine_days rd
    INNER JOIN routines r ON r.id = rd.routine_id
    WHERE rd.id = ${routineDayId}
    LIMIT 1
  `;

  const day = dayRows[0] as { id: number; routine_id: number; trainer_id: number } | undefined;

  if (!day) {
    return redirect("/clients?status=error&message=Rutina%20no%20encontrada");
  }

  const clientId = user.role === "client" ? await getAccessibleClientIdForUser(user) : Number(clientIdRaw);

  if (!clientId || Number.isNaN(clientId)) {
    return redirect("/clients?status=error&message=Cliente%20inválido");
  }

  if (user.role === "trainer" && day.trainer_id !== user.id) {
    return redirect("/login?error=forbidden");
  }
  
  if (user.role === "gym_manager") {
    const trainerRows = await sql`
      SELECT id FROM users WHERE id = ${day.trainer_id} AND gym_id = ${user.gymId}
    `;
    if (!trainerRows.length) {
      return redirect("/login?error=forbidden");
    }
  }

  const clientRows = await sql`
    SELECT id, trainer_id
    FROM clients
    WHERE id = ${clientId}
    LIMIT 1
  ` as Array<{ id: number; trainer_id: number | null }>;

  const client = clientRows[0];

  if (!client) {
    return redirect("/clients?status=error&message=Cliente%20no%20encontrado");
  }

  if (user.role === "client" && client.id !== clientId) {
    return redirect("/login?error=forbidden");
  }

  if (client.trainer_id && client.trainer_id !== day.trainer_id) {
    return redirect("/login?error=forbidden");
  }

  await sql`
    INSERT INTO routine_day_attendances (
      routine_day_id,
      client_id,
      status,
      time_slot,
      notes
    )
    VALUES (
      ${routineDayId},
      ${clientId},
      ${status},
      ${timeSlot},
      ${notes}
    )
    ON CONFLICT (routine_day_id, client_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      time_slot = EXCLUDED.time_slot,
      checked_at = NOW(),
      notes = EXCLUDED.notes
  `;

  await sql`
    INSERT INTO routine_notifications (
      trainer_id,
      client_id,
      routine_day_id,
      type,
      title,
      message
    )
    VALUES (
      ${day.trainer_id},
      ${clientId},
      ${routineDayId},
      'attendance',
      ${status === "going" ? "Nueva confirmación de asistencia" : "Cliente no asistirá"},
      ${status === "going"
        ? `El cliente marcó asistencia para ${getTimeSlotLabel(timeSlot)}.`
        : `El cliente marcó que no asistirá en ${getTimeSlotLabel(timeSlot)}.`}
    )
    RETURNING id
  `;

  const target = user.role === "client" ? `/clients/${clientId}` : `/routines/${day.routine_id}`;
  const message = status === "going" ? "Asistencia%20confirmada" : "Marcado%20como%20no%20asistiré";

  return redirect(`${target}?status=success&message=${message}`);
};
