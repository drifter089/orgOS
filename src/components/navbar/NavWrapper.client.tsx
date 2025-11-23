"use client";

import { useMemo } from "react";

import { usePathname } from "next/navigation";

import { generateBreadcrumbs, isOrganizationPage } from "@/lib/nav-tree";
import { api } from "@/trpc/react";

import { FancyNav } from "./FancyNav.client";

interface NavWrapperProps {
  user: {
    firstName?: string | null;
  } | null;
  signUpUrl: string;
  signOutAction: () => Promise<void>;
}

/**
 * Wrapper component that detects route context and provides
 * breadcrumb data to FancyNav
 */
export function NavWrapper({
  user,
  signUpUrl,
  signOutAction,
}: NavWrapperProps) {
  const pathname = usePathname();
  const isOrgPage = isOrganizationPage(pathname);

  // Extract team ID from pathname if on team detail page
  const teamId = useMemo(() => {
    if (pathname.startsWith("/teams/")) {
      const segments = pathname.split("/");
      return segments[2]; // /teams/:id
    }
    return null;
  }, [pathname]);

  // Fetch organization data when on org pages
  const { data: orgData } = api.organization.getCurrent.useQuery(undefined, {
    enabled: isOrgPage,
    retry: false,
  });

  // Only fetch team data when on team detail page and user is authenticated
  // org routes are already protected by middleware, so if we're here, user is authenticated
  const { data: team } = api.team.getById.useQuery(
    { id: teamId! },
    {
      enabled: !!teamId && isOrgPage,
      // Show placeholder on error
      retry: false,
    },
  );

  // Generate breadcrumbs based on current pathname
  const breadcrumbs = useMemo(() => {
    if (!isOrgPage) return undefined;
    return generateBreadcrumbs(
      pathname,
      team?.name,
      orgData?.organization.name,
    );
  }, [isOrgPage, pathname, team?.name, orgData?.organization.name]);

  return (
    <FancyNav
      user={user}
      signUpUrl={signUpUrl}
      signOutAction={signOutAction}
      isOrgPage={isOrgPage}
      breadcrumbs={breadcrumbs}
    />
  );
}
