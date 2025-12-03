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
  tabs?: BreadcrumbTabs;
}

export interface BreadcrumbDropdown {
  type: "teams";
  items: DropdownItem[];
}

export interface BreadcrumbTabs {
  items: TabItem[];
  activeTab: string;
}

export interface TabItem {
  label: string;
  path: string;
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

  // /teams/:id route - show: icon -> org -> team (dropdown) -> [Roles|KPIs tabs]
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

    // Tabs for switching between Roles and KPIs
    breadcrumbs.push({
      id: "view-tabs",
      label: "Roles",
      path: `/teams/${teamId}`,
      isCurrentPage: true,
      isNavigable: false,
      tabs: {
        activeTab: "roles",
        items: [
          { label: "Roles", path: `/teams/${teamId}` },
          { label: "KPIs", path: `/dashboard/${teamId}` },
        ],
      },
    });
    return breadcrumbs;
  }

  // /dashboard/default route - show: icon -> org -> All Teams -> Dashboard
  if (pathname === "/dashboard/default") {
    breadcrumbs.push({
      id: "team",
      label: "All Teams",
      path: `/dashboard/default`,
      isCurrentPage: false,
      isNavigable: false,
      dropdown: {
        type: "teams",
        items: [], // Populated by component with actual teams
      },
    });

    breadcrumbs.push({
      id: "view",
      label: "KPIs",
      path: `/dashboard/default`,
      isCurrentPage: true,
      isNavigable: false,
    });
    return breadcrumbs;
  }

  // /dashboard/:teamId route - show: icon -> org -> team (dropdown) -> [Roles|KPIs tabs]
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

    // Tabs for switching between Roles and KPIs
    breadcrumbs.push({
      id: "view-tabs",
      label: "KPIs",
      path: `/dashboard/${teamId}`,
      isCurrentPage: true,
      isNavigable: false,
      tabs: {
        activeTab: "kpis",
        items: [
          { label: "Roles", path: `/teams/${teamId}` },
          { label: "KPIs", path: `/dashboard/${teamId}` },
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
