type TeamRouteRole = "admin" | "gym_manager" | "trainer" | "client";

export function getTeamListHref(role: TeamRouteRole) {
  return role === "gym_manager" ? "/gym/team" : "/admin/trainers";
}

export function getTeamNewHref(role: TeamRouteRole) {
  return role === "gym_manager" ? "/gym/team/new" : "/admin/trainers/new";
}

export function getTeamEditHref(role: TeamRouteRole, id: number) {
  return role === "gym_manager" ? `/gym/team/${id}/edit` : `/admin/trainers/${id}/edit`;
}
