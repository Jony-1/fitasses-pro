export type ClientTabKey = "routine" | "progress" | "assessments";

export function getClientTabs(clientId: number, active: ClientTabKey) {
  return [
    { href: `/clients/${clientId}/routine`, label: "Mi rutina", active: active === "routine" },
    { href: `/clients/${clientId}/progress`, label: "Mi progreso", active: active === "progress" },
    { href: `/clients/${clientId}/assessments`, label: "Valoraciones", active: active === "assessments" },
  ];
}
