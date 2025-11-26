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
  isNavigable?: boolean;
  dropdown?: BreadcrumbDropdown;
}

export interface BreadcrumbDropdown {
  type: "teams" | "view";
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
 * @param teamId - Team ID extracted from route
 * @param teamName - Optional team name for team routes
 * @param organizationName - Optional organization name
 * @returns Array of breadcrumb items
 */
export function generateBreadcrumbs(
  pathname: string,
  teamId: string | null,
  teamName?: string,
  organizationName?: string,
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Always start with Home icon
  breadcrumbs.push({
    id: "home",
    label: "Home",
    path: "/org",
    isCurrentPage: false,
    icon: "home",
    isNavigable: true,
  });

  // /org route - just show org name as current page
  if (pathname === "/org") {
    breadcrumbs.push({
      id: "org",
      label: organizationName ?? "Organization",
      path: "/org",
      isCurrentPage: true,
      isNavigable: false,
    });
    return breadcrumbs;
  }

  // For team-related routes, add org name (navigable to /org)
  if (pathname.startsWith("/teams/") || pathname.startsWith("/dashboard/")) {
    breadcrumbs.push({
      id: "org",
      label: organizationName ?? "Organization",
      path: "/org",
      isCurrentPage: false,
      isNavigable: true,
    });
  }

  // /teams/:id route - show: icon -> org -> team (dropdown) -> Roles (dropdown)
  if (pathname.startsWith("/teams/") && teamId) {
    // Team name with dropdown for team switching (not navigable itself)
    breadcrumbs.push({
      id: "team",
      label: teamName ?? "Team",
      path: `/teams/${teamId}`,
      isCurrentPage: false,
      isNavigable: false,
      dropdown: {
        type: "teams",
        items: [], // Populated by component with actual teams
      },
    });

    // "Roles" as current page with dropdown to switch to Dashboard
    breadcrumbs.push({
      id: "view",
      label: "Roles",
      path: `/teams/${teamId}`,
      isCurrentPage: true,
      isNavigable: false,
      dropdown: {
        type: "view",
        items: [
          { label: "Roles", path: `/teams/${teamId}` },
          { label: "Dashboard", path: `/dashboard/${teamId}` },
        ],
      },
    });
    return breadcrumbs;
  }

  // /dashboard/:teamId route - show: icon -> org -> team (dropdown) -> Dashboard (dropdown)
  if (pathname.startsWith("/dashboard/") && teamId) {
    // Team name with dropdown for team switching (not navigable itself)
    breadcrumbs.push({
      id: "team",
      label: teamName ?? "Team",
      path: `/dashboard/${teamId}`,
      isCurrentPage: false,
      isNavigable: false,
      dropdown: {
        type: "teams",
        items: [], // Populated by component with actual teams
      },
    });

    // "Dashboard" as current page with dropdown to switch to Roles
    breadcrumbs.push({
      id: "view",
      label: "Dashboard",
      path: `/dashboard/${teamId}`,
      isCurrentPage: true,
      isNavigable: false,
      dropdown: {
        type: "view",
        items: [
          { label: "Roles", path: `/teams/${teamId}` },
          { label: "Dashboard", path: `/dashboard/${teamId}` },
        ],
      },
    });
    return breadcrumbs;
  }

  // /teams list page (no team selected)
  if (pathname === "/teams") {
    breadcrumbs.push({
      id: "teams",
      label: "Teams",
      path: "/teams",
      isCurrentPage: true,
      isNavigable: false,
    });
    return breadcrumbs;
  }

  return breadcrumbs;
}

/**
 * Check if a pathname is an organization page (shows breadcrumb nav)
 * @param pathname - Current route pathname
 * @returns True if pathname is an organization page
 */
export function isOrganizationPage(pathname: string): boolean {
  return (
    pathname === "/org" ||
    pathname.startsWith("/teams") ||
    pathname.startsWith("/dashboard/")
  );
}
