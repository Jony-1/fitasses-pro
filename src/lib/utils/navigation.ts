export function normalizePath(path: string): string {
  if (path === "/") return "/";
  return path.replace(/\/+$/, "");
}

export function getHrefPath(href: string): string {
  return normalizePath(href.split(/[?#]/)[0] ?? href);
}

export function isActive(currentPath: string, href: string): boolean {
  return normalizePath(currentPath) === getHrefPath(href);
}

export type NavItem = {
  label: string;
  href: string;
  icon: string;
  visible?: boolean;
  active?: boolean;
};

type NavigationUser = {
  role: "admin" | "gym_manager" | "trainer" | "client";
} | null;

export function buildNavItems(user: NavigationUser, clientId: number | null): Omit<NavItem, "active">[] {
  const isAdmin = user?.role === "admin";
  const isGymManager = user?.role === "gym_manager";
  const isTrainer = user?.role === "trainer";
  const isClient = user?.role === "client";
  const canManageClients = isTrainer || isAdmin || isGymManager;
  const canManageTrainers = isAdmin || isGymManager;
  const canManageRoutines = isTrainer || isAdmin || isGymManager;
  const dashboardHref = isGymManager ? "/gym-manager" : "/dashboard";
  const teamLabel = isGymManager ? "Equipo" : "Entrenadores";
  const teamHref = isGymManager ? "/gym/team" : "/admin/trainers";

  return [
    { label: "Panel", href: dashboardHref, icon: "📊", visible: !!user && !isClient },
    { label: "Mi cuenta", href: "/client-home", icon: "🏠", visible: isClient },
    { label: "Mi rutina", href: clientId ? `/clients/${clientId}/routine` : "/client-home", icon: "🗓️", visible: isClient && !!clientId },
    { label: "Ejercicios", href: "/client-exercises", icon: "🎴", visible: isClient },
    { label: "Mi progreso", href: clientId ? `/clients/${clientId}/progress` : "/client-home", icon: "📈", visible: isClient && !!clientId },
    { label: "Valoraciones", href: clientId ? `/clients/${clientId}/assessments` : "/client-home", icon: "🧾", visible: isClient && !!clientId },
    { label: "Clientes", href: "/clients", icon: "👥", visible: canManageClients },
    { label: "Ejercicios", href: "/exercises", icon: "🎴", visible: canManageRoutines },
    { label: "Nuevo cliente", href: "/clients/new", icon: "➕", visible: canManageClients },
    { label: "Rutinas", href: "/routines", icon: "🗓️", visible: canManageRoutines },
    { label: teamLabel, href: teamHref, icon: "🏋️", visible: canManageTrainers },
    { label: "Gimnasios", href: "/admin/gyms", icon: "🏢", visible: isAdmin },
    { label: "Administración", href: "/admin", icon: "🏴‍☠️", visible: isAdmin },
  ].filter((item) => item.visible);
}

export function computeNavItemsWithActive(
  items: Omit<NavItem, "active">[],
  currentPath: string
): NavItem[] {
  return items.map(item => ({
    ...item,
    active: isActive(currentPath, item.href)
  }));
}
