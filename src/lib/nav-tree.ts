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
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(
  pathname: string,
  teamName?: string,
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
      label: "Org",
      path: "/org",
      isCurrentPage: true,
    });
    return breadcrumbs;
  }

  // Always add Org as second item for nested routes
  breadcrumbs.push({
    id: "org",
    label: "Org",
    path: "/org",
    isCurrentPage: false,
  });

  // /teams routes
  if (pathname === "/teams") {
    breadcrumbs.push({
      id: "teams",
      label: "Team",
      path: "/teams",
      isCurrentPage: true,
      dropdown: {
        type: "navigation",
        items: [
          { label: "Team", path: "/teams" },
          { label: "Integration", path: "/integration" },
        ],
      },
    });
    return breadcrumbs;
  }

  // /teams/:id route
  if (pathname.startsWith("/teams/")) {
    breadcrumbs.push({
      id: "teams",
      label: "Team",
      path: "/teams",
      isCurrentPage: false,
      dropdown: {
        type: "navigation",
        items: [
          { label: "Team", path: "/teams" },
          { label: "Integration", path: "/integration" },
        ],
      },
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
      label: "Integration",
      path: "/integration",
      isCurrentPage: true,
      dropdown: {
        type: "navigation",
        items: [
          { label: "Team", path: "/teams" },
          { label: "Integration", path: "/integration" },
        ],
      },
    });
    return breadcrumbs;
  }

  // Integration sub-pages need Integration as parent
  if (pathname === "/metric" || pathname === "/dashboard") {
    breadcrumbs.push({
      id: "integration",
      label: "Integration",
      path: "/integration",
      isCurrentPage: false,
      dropdown: {
        type: "navigation",
        items: [
          { label: "Team", path: "/teams" },
          { label: "Integration", path: "/integration" },
        ],
      },
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
