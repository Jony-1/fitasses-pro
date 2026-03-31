export type AppRole = "admin" | "gym_manager" | "trainer" | "client";

export function isAdmin(role: AppRole | null | undefined) {
  return role === "admin";
}

export function isGymManager(role: AppRole | null | undefined) {
  return role === "gym_manager";
}

export function isTrainer(role: AppRole | null | undefined) {
  return role === "trainer";
}

export function isClient(role: AppRole | null | undefined) {
  return role === "client";
}

export function canManageClients(role: AppRole | null | undefined) {
  return role === "admin" || role === "gym_manager" || role === "trainer";
}

export function canManageAssessments(role: AppRole | null | undefined) {
  return canManageClients(role);
}

export function canManageRoutines(role: AppRole | null | undefined) {
  return canManageClients(role);
}

export function canManageTrainers(role: AppRole | null | undefined) {
  return role === "admin" || role === "gym_manager";
}

export function isStaffRole(role: AppRole | null | undefined) {
  return canManageClients(role);
}
