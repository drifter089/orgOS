/**
 * Navigation Tree Utility
 * Generates breadcrumb navigation items based on current pathname
 */

export interface BreadcrumbItem {
  id: string;
  label: string;
  path: string;
  isCurrentPage: boolean;
  icon?: "home";
  dropdown?: BreadcrumbDropdown;
}

export interface BreadcrumbDropdown {
  type: "navigation" | "teams";
  items: DropdownItem[];
}

export interface DropdownItem {
  label: string;
  path: string;
  icon?: string;
}

/**
 * Generate breadcrumb items for the current pathname
 * @param pathname - Current route pathname
 * @param teamName - Optional team name for /teams/:id routes
 * @param organizationName - Optional organization name
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(
  pathname: string,
  teamName?: string,
  organizationName?: string,
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with Home icon for org pages
  breadcrumbs.push({
    id: "home",
    label: "Home",
    path: "/",
    isCurrentPage: false,
    icon: "home",
  });

  // /org route
  if (pathname === "/org") {
    breadcrumbs.push({
      id: "org",
      label: organizationName ?? "Org",
      path: "/org",
      isCurrentPage: true,
    });
    return breadcrumbs;
  }

  // Always add Org as second item for nested routes
  breadcrumbs.push({
    id: "org",
    label: organizationName ?? "Org",
    path: "/org",
    isCurrentPage: false,
  });

  // /teams routes
  if (pathname === "/teams") {
    breadcrumbs.push({
      id: "teams",
      label: "Roles",
      path: "/teams",
      isCurrentPage: true,
    });
    return breadcrumbs;
  }

  // /teams/:id route
  if (pathname.startsWith("/teams/")) {
    breadcrumbs.push({
      id: "teams",
      label: "Roles",
      path: "/teams",
      isCurrentPage: false,
    });

    breadcrumbs.push({
      id: "team-detail",
      label: teamName ?? "Team",
      path: pathname,
      isCurrentPage: true,
      dropdown: {
        type: "teams", // Special type for team switcher
        items: [], // Will be populated by component with actual teams
      },
    });
    return breadcrumbs;
  }

  // /integration route
  if (pathname === "/integration") {
    breadcrumbs.push({
      id: "integration",
      label: "KPI's",
      path: "/integration",
      isCurrentPage: true,
    });
    return breadcrumbs;
  }

  // Integration sub-pages need Integration as parent
  if (pathname === "/metric" || pathname === "/dashboard") {
    breadcrumbs.push({
      id: "integration",
      label: "KPI's",
      path: "/integration",
      isCurrentPage: false,
    });

    if (pathname === "/metric") {
      breadcrumbs.push({
        id: "metric",
        label: "Metric",
        path: "/metric",
        isCurrentPage: true,
      });
    } else if (pathname === "/dashboard") {
      breadcrumbs.push({
        id: "dashboard",
        label: "Dashboard",
        path: "/dashboard",
        isCurrentPage: true,
      });
    }
    return breadcrumbs;
  }

  // Fallback - should not reach here for valid org routes
  return breadcrumbs;
}

/**
 * Check if a pathname is an organization page
 * @param pathname - Current route pathname
 * @returns True if pathname is an organization page
 */
export function isOrganizationPage(pathname: string): boolean {
  return (
    pathname === "/org" ||
    pathname.startsWith("/teams") ||
    pathname === "/integration" ||
    pathname === "/metric" ||
    pathname === "/dashboard"
  );
}
