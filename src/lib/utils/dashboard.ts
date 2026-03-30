import { sql } from "../db/client";

export type DashboardRole = "admin" | "gym_manager" | "trainer";

export type DashboardUser = {
    id: number;
    name: string;
    role: DashboardRole;
    gymId: number | null;
};

export type DashboardStatValue = {
    totalClients: number;
    activeClients: number;
    totalAssessments: number;
    assessmentsThisMonth: number;
    clientsWithoutRecentAssessment: number;
    trainersTotal?: number;
    clientUsersTotal?: number;
};

export type DashboardRecentAssessment = {
    id: number;
    client_id: number;
    client_name: string;
    assessment_date: string | Date;
    weight_kg: number | null;
    body_fat_pct: number | null;
    muscle_pct: number | null;
    bmi: number | null;
    created_at: string | Date;
};

export type DashboardRecentClient = {
    id: number;
    full_name: string;
    created_at: string | Date;
    active: boolean;
};

export type DashboardRiskClient = {
    id: number;
    full_name: string;
    last_assessment_date: string | Date | null;
    days_since_last_assessment: number | null;
};

export type DashboardTrendPoint = {
    label: string;
    weight: number | null;
    bodyFat: number | null;
    muscle: number | null;
    assessments: number;
};

export type DashboardAttendanceSummary = {
    key: "morning" | "midday" | "night" | "other";
    label: string;
    count: number;
};

export type DashboardNotification = {
    id: number;
    title: string;
    description: string;
    tone: DashboardAlertTone;
    createdAt: string | Date;
    readAt: string | Date | null;
    href?: string;
};

export type DashboardAlertTone = "warning" | "info" | "success";

export type DashboardAlert = {
    tone: DashboardAlertTone;
    title: string;
    description: string;
    href?: string;
};

export type DashboardQuickAction = {
    title: string;
    description: string;
    href: string;
    icon: string;
};

export type DashboardData = {
    role: DashboardRole;
    gymName: string | null;
    stats: DashboardStatValue;
    attendanceSummary: DashboardAttendanceSummary[];
    recentNotifications: DashboardNotification[];
    trends: DashboardTrendPoint[];
    riskClients: DashboardRiskClient[];
    recentAssessments: DashboardRecentAssessment[];
    recentClients: DashboardRecentClient[];
    alerts: DashboardAlert[];
    quickActions: DashboardQuickAction[];
};

function formatTrendLabel(value: string) {
    const date = new Date(`${value}-01T00:00:00Z`);

    return new Intl.DateTimeFormat("es-CO", {
        month: "short",
        year: "numeric",
    }).format(date);
}

function buildTrendRange(months = 6) {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1));

    return Array.from({ length: months }, (_, index) => {
        const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + index, 1));
        const key = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

        return {
            key,
            label: formatTrendLabel(key),
        };
    });
}

async function getClientCounts(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      COUNT(*)::int AS total_clients,
                      COUNT(*) FILTER (WHERE active = true)::int AS active_clients
                  FROM clients
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        COUNT(*)::int AS total_clients,
                        COUNT(*) FILTER (WHERE c.active = true)::int AS active_clients
                    FROM clients c
                    INNER JOIN users t ON t.id = c.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                `
              : await sql`
                    SELECT
                        COUNT(*)::int AS total_clients,
                        COUNT(*) FILTER (WHERE active = true)::int AS active_clients
                    FROM clients
                    WHERE trainer_id = ${user.id}
                `;

    return rows[0] ?? { total_clients: 0, active_clients: 0 };
}

async function getAssessmentCounts(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      COUNT(*)::int AS total_assessments,
                      COUNT(*) FILTER (
                          WHERE assessment_date >= date_trunc('month', CURRENT_DATE)
                      )::int AS assessments_this_month
                  FROM assessments
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        COUNT(*)::int AS total_assessments,
                        COUNT(*) FILTER (
                            WHERE a.assessment_date >= date_trunc('month', CURRENT_DATE)
                        )::int AS assessments_this_month
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    INNER JOIN users t ON t.id = c.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                `
              : await sql`
                    SELECT
                        COUNT(*)::int AS total_assessments,
                        COUNT(*) FILTER (
                            WHERE a.assessment_date >= date_trunc('month', CURRENT_DATE)
                        )::int AS assessments_this_month
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    WHERE c.trainer_id = ${user.id}
                `;

    return rows[0] ?? { total_assessments: 0, assessments_this_month: 0 };
}

async function getRecentAssessments(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      a.id,
                      a.client_id,
                      c.full_name AS client_name,
                      a.assessment_date,
                      a.weight_kg,
                      a.body_fat_pct,
                      a.muscle_pct,
                      a.bmi,
                      a.created_at
                  FROM assessments a
                  INNER JOIN clients c ON c.id = a.client_id
                  ORDER BY a.created_at DESC, a.id DESC
                  LIMIT 5
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        a.id,
                        a.client_id,
                        c.full_name AS client_name,
                        a.assessment_date,
                        a.weight_kg,
                        a.body_fat_pct,
                        a.muscle_pct,
                        a.bmi,
                        a.created_at
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    INNER JOIN users t ON t.id = c.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                    ORDER BY a.created_at DESC, a.id DESC
                    LIMIT 5
                `
              : await sql`
                    SELECT
                        a.id,
                        a.client_id,
                        c.full_name AS client_name,
                        a.assessment_date,
                        a.weight_kg,
                        a.body_fat_pct,
                        a.muscle_pct,
                        a.bmi,
                        a.created_at
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    WHERE c.trainer_id = ${user.id}
                    ORDER BY a.created_at DESC, a.id DESC
                    LIMIT 5
                `;

    return rows as unknown as DashboardRecentAssessment[];
}

async function getRecentClients(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      id,
                      full_name,
                      created_at,
                      active
                  FROM clients
                  ORDER BY created_at DESC, id DESC
                  LIMIT 5
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        c.id,
                        c.full_name,
                        c.created_at,
                        c.active
                    FROM clients c
                    INNER JOIN users t ON t.id = c.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                    ORDER BY c.created_at DESC, c.id DESC
                    LIMIT 5
                `
              : await sql`
                    SELECT
                        id,
                        full_name,
                        created_at,
                        active
                    FROM clients
                    WHERE trainer_id = ${user.id}
                    ORDER BY created_at DESC, id DESC
                    LIMIT 5
                `;

    return rows as unknown as DashboardRecentClient[];
}

async function getClientsWithoutRecentAssessment(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT COUNT(*)::int AS total
                  FROM clients c
                  LEFT JOIN LATERAL (
                      SELECT a.assessment_date
                      FROM assessments a
                      WHERE a.client_id = c.id
                      ORDER BY a.assessment_date DESC, a.id DESC
                      LIMIT 1
                  ) last_assessment ON true
                  WHERE last_assessment.assessment_date IS NULL
                     OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT COUNT(*)::int AS total
                    FROM clients c
                    INNER JOIN users t ON t.id = c.trainer_id
                    LEFT JOIN LATERAL (
                        SELECT a.assessment_date
                        FROM assessments a
                        WHERE a.client_id = c.id
                        ORDER BY a.assessment_date DESC, a.id DESC
                        LIMIT 1
                    ) last_assessment ON true
                    WHERE t.gym_id = ${user.gymId}
                      AND (
                          last_assessment.assessment_date IS NULL
                          OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
                      )
                `
              : await sql`
                    SELECT COUNT(*)::int AS total
                    FROM clients c
                    LEFT JOIN LATERAL (
                        SELECT a.assessment_date
                        FROM assessments a
                        WHERE a.client_id = c.id
                        ORDER BY a.assessment_date DESC, a.id DESC
                        LIMIT 1
                    ) last_assessment ON true
                    WHERE c.trainer_id = ${user.id}
                      AND (
                          last_assessment.assessment_date IS NULL
                          OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
                      )
                `;

    return rows[0]?.total ?? 0;
}

async function getRiskClients(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      c.id,
                      c.full_name,
                      last_assessment.assessment_date AS last_assessment_date,
                      CASE
                          WHEN last_assessment.assessment_date IS NULL THEN NULL
                          ELSE CURRENT_DATE - last_assessment.assessment_date
                      END AS days_since_last_assessment
                  FROM clients c
                  LEFT JOIN LATERAL (
                      SELECT a.assessment_date
                      FROM assessments a
                      WHERE a.client_id = c.id
                      ORDER BY a.assessment_date DESC, a.id DESC
                      LIMIT 1
                  ) last_assessment ON true
                  WHERE last_assessment.assessment_date IS NULL
                     OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
                  ORDER BY last_assessment.assessment_date NULLS FIRST, c.created_at DESC
                  LIMIT 5
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        c.id,
                        c.full_name,
                        last_assessment.assessment_date AS last_assessment_date,
                        CASE
                            WHEN last_assessment.assessment_date IS NULL THEN NULL
                            ELSE CURRENT_DATE - last_assessment.assessment_date
                        END AS days_since_last_assessment
                    FROM clients c
                    INNER JOIN users t ON t.id = c.trainer_id
                    LEFT JOIN LATERAL (
                        SELECT a.assessment_date
                        FROM assessments a
                        WHERE a.client_id = c.id
                        ORDER BY a.assessment_date DESC, a.id DESC
                        LIMIT 1
                    ) last_assessment ON true
                    WHERE t.gym_id = ${user.gymId}
                      AND (
                          last_assessment.assessment_date IS NULL
                          OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
                      )
                    ORDER BY last_assessment.assessment_date NULLS FIRST, c.created_at DESC
                    LIMIT 5
                `
              : await sql`
                    SELECT
                        c.id,
                        c.full_name,
                        last_assessment.assessment_date AS last_assessment_date,
                        CASE
                            WHEN last_assessment.assessment_date IS NULL THEN NULL
                            ELSE CURRENT_DATE - last_assessment.assessment_date
                        END AS days_since_last_assessment
                    FROM clients c
                    LEFT JOIN LATERAL (
                        SELECT a.assessment_date
                        FROM assessments a
                        WHERE a.client_id = c.id
                        ORDER BY a.assessment_date DESC, a.id DESC
                        LIMIT 1
                    ) last_assessment ON true
                    WHERE c.trainer_id = ${user.id}
                      AND (
                          last_assessment.assessment_date IS NULL
                          OR last_assessment.assessment_date < CURRENT_DATE - INTERVAL '30 days'
                      )
                    ORDER BY last_assessment.assessment_date NULLS FIRST, c.created_at DESC
                    LIMIT 5
                `;

    return rows as unknown as DashboardRiskClient[];
}

async function getTrendData(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      to_char(date_trunc('month', a.assessment_date), 'YYYY-MM') AS month_key,
                      ROUND(AVG(a.weight_kg)::numeric, 2) AS weight,
                      ROUND(AVG(a.body_fat_pct)::numeric, 2) AS body_fat,
                      ROUND(AVG(a.muscle_pct)::numeric, 2) AS muscle,
                      COUNT(*)::int AS assessments
                  FROM assessments a
                  WHERE a.assessment_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                  GROUP BY 1
                  ORDER BY 1 ASC
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        to_char(date_trunc('month', a.assessment_date), 'YYYY-MM') AS month_key,
                        ROUND(AVG(a.weight_kg)::numeric, 2) AS weight,
                        ROUND(AVG(a.body_fat_pct)::numeric, 2) AS body_fat,
                        ROUND(AVG(a.muscle_pct)::numeric, 2) AS muscle,
                        COUNT(*)::int AS assessments
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    INNER JOIN users t ON t.id = c.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                      AND a.assessment_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                    GROUP BY 1
                    ORDER BY 1 ASC
                `
              : await sql`
                    SELECT
                        to_char(date_trunc('month', a.assessment_date), 'YYYY-MM') AS month_key,
                        ROUND(AVG(a.weight_kg)::numeric, 2) AS weight,
                        ROUND(AVG(a.body_fat_pct)::numeric, 2) AS body_fat,
                        ROUND(AVG(a.muscle_pct)::numeric, 2) AS muscle,
                        COUNT(*)::int AS assessments
                    FROM assessments a
                    INNER JOIN clients c ON c.id = a.client_id
                    WHERE c.trainer_id = ${user.id}
                      AND a.assessment_date >= date_trunc('month', CURRENT_DATE) - INTERVAL '5 months'
                    GROUP BY 1
                    ORDER BY 1 ASC
                `;

    const trendRange = buildTrendRange(6);

    return trendRange.map((month) => {
        const row = rows.find((item) => item.month_key === month.key);

        return {
            label: month.label,
            weight: row?.weight === null || row?.weight === undefined ? null : Number(row.weight),
            bodyFat:
                row?.body_fat === null || row?.body_fat === undefined
                    ? null
                    : Number(row.body_fat),
            muscle:
                row?.muscle === null || row?.muscle === undefined
                    ? null
                    : Number(row.muscle),
            assessments: row?.assessments ?? 0,
        };
    });
}

async function getAttendanceSummary(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'morning')::int AS morning,
                      COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'midday')::int AS midday,
                      COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'night')::int AS night,
                      COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'other')::int AS other
                  FROM routine_day_attendances ra
                  INNER JOIN routine_days rd ON rd.id = ra.routine_day_id
                  INNER JOIN routines r ON r.id = rd.routine_id
                  WHERE ra.checked_at >= date_trunc('month', CURRENT_DATE)
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'morning')::int AS morning,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'midday')::int AS midday,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'night')::int AS night,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'other')::int AS other
                    FROM routine_day_attendances ra
                    INNER JOIN routine_days rd ON rd.id = ra.routine_day_id
                    INNER JOIN routines r ON r.id = rd.routine_id
                    INNER JOIN users t ON t.id = r.trainer_id
                    WHERE t.gym_id = ${user.gymId}
                      AND ra.checked_at >= date_trunc('month', CURRENT_DATE)
                `
              : await sql`
                    SELECT
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'morning')::int AS morning,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'midday')::int AS midday,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'night')::int AS night,
                        COUNT(*) FILTER (WHERE ra.status = 'going' AND ra.time_slot = 'other')::int AS other
                    FROM routine_day_attendances ra
                    INNER JOIN routine_days rd ON rd.id = ra.routine_day_id
                    INNER JOIN routines r ON r.id = rd.routine_id
                    WHERE r.trainer_id = ${user.id}
                      AND ra.checked_at >= date_trunc('month', CURRENT_DATE)
                `;

    const row = rows[0] ?? { morning: 0, midday: 0, night: 0, other: 0 };

    return [
        { key: "morning", label: "Mañana", count: row.morning ?? 0 },
        { key: "midday", label: "Mediodía", count: row.midday ?? 0 },
        { key: "night", label: "Noche", count: row.night ?? 0 },
        { key: "other", label: "Otro horario", count: row.other ?? 0 },
    ] satisfies DashboardAttendanceSummary[];
}

async function getRecentNotifications(user: DashboardUser) {
    const rows =
        user.role === "admin"
            ? await sql`
                  SELECT
                      n.id,
                      n.title,
                      n.message AS description,
                      n.created_at,
                      n.read_at,
                      CASE
                          WHEN n.type = 'attendance' AND n.title ILIKE '%no asistirá%' THEN 'warning'
                          WHEN n.type = 'attendance' THEN 'success'
                          ELSE 'info'
                      END AS tone,
                      rd.id AS routine_day_id,
                      r.id AS routine_id,
                      r.client_id
                  FROM routine_notifications n
                  LEFT JOIN routine_days rd ON rd.id = n.routine_day_id
                  LEFT JOIN routines r ON r.id = rd.routine_id
                  ORDER BY n.created_at DESC, n.id DESC
                  LIMIT 6
              `
            : user.role === "gym_manager"
              ? await sql`
                    SELECT
                        n.id,
                        n.title,
                        n.message AS description,
                        n.created_at,
                        n.read_at,
                        CASE
                            WHEN n.type = 'attendance' AND n.title ILIKE '%no asistirá%' THEN 'warning'
                            WHEN n.type = 'attendance' THEN 'success'
                            ELSE 'info'
                        END AS tone,
                        rd.id AS routine_day_id,
                        r.id AS routine_id,
                        r.client_id
                    FROM routine_notifications n
                    LEFT JOIN routine_days rd ON rd.id = n.routine_day_id
                    LEFT JOIN routines r ON r.id = rd.routine_id
                    WHERE n.trainer_id IN (
                        SELECT id
                        FROM users
                        WHERE gym_id = ${user.gymId}
                          AND role = 'trainer'
                    )
                    ORDER BY n.created_at DESC, n.id DESC
                    LIMIT 6
                `
              : await sql`
                    SELECT
                        n.id,
                        n.title,
                        n.message AS description,
                        n.created_at,
                        n.read_at,
                        CASE
                            WHEN n.type = 'attendance' AND n.title ILIKE '%no asistirá%' THEN 'warning'
                            WHEN n.type = 'attendance' THEN 'success'
                            ELSE 'info'
                        END AS tone,
                        rd.id AS routine_day_id,
                        r.id AS routine_id,
                        r.client_id
                    FROM routine_notifications n
                    LEFT JOIN routine_days rd ON rd.id = n.routine_day_id
                    LEFT JOIN routines r ON r.id = rd.routine_id
                    WHERE n.trainer_id = ${user.id}
                    ORDER BY n.created_at DESC, n.id DESC
                    LIMIT 6
                `;

    return rows.map((row) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        tone: row.tone,
        createdAt: row.created_at,
        readAt: row.read_at,
        href: row.client_id ? `/clients/${row.client_id}/routine` : row.routine_id ? `/routines/${row.routine_id}` : "/dashboard",
    })) as DashboardNotification[];
}

async function getAdminStats(user: DashboardUser) {
    const trainerRows =
        user.role === "gym_manager"
            ? await sql`
                  SELECT COUNT(*)::int AS total
                  FROM users
                  WHERE role = 'trainer'
                    AND gym_id = ${user.gymId}
              `
            : await sql`
                  SELECT COUNT(*)::int AS total
                  FROM users
                  WHERE role = 'trainer'
              `;

    const clientUserRows = await sql`
        SELECT COUNT(*)::int AS total
        FROM users
        WHERE role = 'client'
    `;

    return {
        trainersTotal: trainerRows[0]?.total ?? 0,
        clientUsersTotal: clientUserRows[0]?.total ?? 0,
    };
}

async function getGymName(user: DashboardUser) {
    if (user.role === "admin" || user.gymId === null) return null;

    const rows = await sql`
        SELECT name
        FROM gyms
        WHERE id = ${user.gymId}
        LIMIT 1
    `;

    return rows[0]?.name ?? null;
}

export async function getDashboardData(user: DashboardUser): Promise<DashboardData> {
    const adminStatsPromise =
        user.role === "admin" || user.role === "gym_manager"
            ? getAdminStats(user)
            : Promise.resolve({});

    const [clientCounts, assessmentCounts, recentAssessments, recentClients, clientsWithoutRecentAssessment, trends, riskClients, attendanceSummary, recentNotifications, gymName, adminStats] =
        await Promise.all([
            getClientCounts(user),
            getAssessmentCounts(user),
            getRecentAssessments(user),
            getRecentClients(user),
            getClientsWithoutRecentAssessment(user),
            getTrendData(user),
            getRiskClients(user),
            getAttendanceSummary(user),
            getRecentNotifications(user),
            getGymName(user),
            adminStatsPromise,
        ]);

    const stats: DashboardStatValue = {
        totalClients: clientCounts.total_clients ?? 0,
        activeClients: clientCounts.active_clients ?? 0,
        totalAssessments: assessmentCounts.total_assessments ?? 0,
        assessmentsThisMonth: assessmentCounts.assessments_this_month ?? 0,
        clientsWithoutRecentAssessment,
        ...adminStats,
    };

    const alerts: DashboardAlert[] = [];

    if (clientsWithoutRecentAssessment > 0) {
        alerts.push({
            tone: "warning",
            title: "Clientes sin seguimiento reciente",
            description: `${clientsWithoutRecentAssessment} cliente(s) no tienen una valoración en los últimos 30 días.`,
            href: "/clients",
        });
    }

    if (recentAssessments.length === 0) {
        alerts.push({
            tone: "info",
            title: "Sin actividad reciente",
            description: "Aún no hay valoraciones recientes para mostrar.",
            href: "/clients",
        });
    }

    if (user.role === "admin") {
        alerts.push({
            tone: "success",
            title: "Vista administrativa activa",
            description: "Puedes revisar el crecimiento del sistema y la carga de entrenadores.",
            href: "/admin/trainers",
        });
    }

    const quickActions: DashboardQuickAction[] =
        user.role === "admin"
                ? [
                  {
                      title: "Rutinas",
                      description: "Ver y crear rutinas para tus clientes.",
                      href: "/routines",
                      icon: "🗓️",
                  },
                  {
                      title: "Gestionar entrenadores",
                      description: "Ver y administrar cuentas de entrenadores.",
                      href: "/admin/trainers",
                      icon: "👨‍🏫",
                  },
                  {
                      title: "Gestionar gimnasios",
                      description: "Crear y revisar los gimnasios registrados.",
                      href: "/admin/gyms",
                      icon: "🏢",
                  },
                  {
                      title: "Ver clientes",
                      description: "Consultar clientes y su progreso.",
                      href: "/clients",
                      icon: "👥",
                  },
                  {
                      title: "Crear entrenador",
                      description: "Registrar una nueva cuenta de entrenador.",
                      href: "/admin/trainers/new",
                      icon: "➕",
                  },
                  {
                      title: "Administración",
                      description: "Volver al panel general del sistema.",
                      href: "/admin",
                      icon: "⚙️",
                  },
              ]
            : user.role === "gym_manager"
              ? [
                    {
                        title: "Mis entrenadores",
                        description: "Revisar y administrar tu equipo.",
                        href: "/admin/trainers",
                        icon: "🏋️",
                    },
                    {
                        title: "Nuevo entrenador",
                        description: "Crear un entrenador para tu gimnasio.",
                        href: "/admin/trainers/new",
                        icon: "➕",
                    },
                    {
                        title: "Mi gimnasio",
                        description: "Ver el resumen principal del gimnasio.",
                        href: "/gym-manager",
                        icon: "🏢",
                    },
                    {
                        title: "Seguimiento",
                        description: "Revisar clientes en riesgo del gimnasio.",
                        href: "/gym-manager",
                        icon: "⚠️",
                    },
                ]
            : [
                  {
                      title: "Rutinas",
                      description: "Abrir y gestionar rutinas activas.",
                      href: "/routines",
                      icon: "🗓️",
                  },
                  {
                      title: "Ver clientes",
                      description: "Abrir la lista de clientes asignados.",
                      href: "/clients",
                      icon: "👥",
                  },
                  {
                      title: "Nuevo cliente",
                      description: "Registrar un nuevo cliente.",
                      href: "/clients/new",
                      icon: "➕",
                  },
                  {
                      title: "Nueva valoración",
                      description: "Crear una valoración física.",
                      href: "/clients",
                      icon: "📋",
                  },
                  {
                      title: "Clientes en riesgo",
                      description: "Revisar clientes que necesitan seguimiento.",
                      href: "/clients",
                      icon: "⚠️",
                  },
              ];

    return {
        role: user.role,
        gymName,
        stats,
        trends,
        attendanceSummary,
        recentNotifications,
        riskClients,
        recentAssessments,
        recentClients,
        alerts,
        quickActions,
    };
}
