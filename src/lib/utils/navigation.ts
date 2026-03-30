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
  visible: boolean;
  active?: boolean;
};

export function computeNavItemsWithActive(
  items: Omit<NavItem, "active">[],
  currentPath: string
): NavItem[] {
  return items.map(item => ({
    ...item,
    active: isActive(currentPath, item.href)
  }));
}