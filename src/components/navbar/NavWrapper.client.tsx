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

export function NavWrapper({
  user,
  signUpUrl,
  signOutAction,
}: NavWrapperProps) {
  const pathname = usePathname();

  const isOrgPage = isOrganizationPage(pathname);

  // Extract team ID from pathname for both /teams/:id and /dashboard/:teamId
  const teamId = useMemo(() => {
    if (pathname.startsWith("/teams/")) {
      const segments = pathname.split("/");
      return segments[2] ?? null;
    }
    if (pathname.startsWith("/dashboard/")) {
      const segments = pathname.split("/");
      return segments[2] ?? null;
    }
    return null;
  }, [pathname]);

  // Fetch organization data when on org pages
  const { data: orgData } = api.organization.getCurrent.useQuery(undefined, {
    enabled: isOrgPage,
    retry: false,
  });

  // Fetch team data when on team or dashboard pages (skip "default" which is not a real team)
  const { data: team } = api.team.getById.useQuery(
    { id: teamId! },
    {
      enabled: !!teamId && teamId !== "default" && isOrgPage,
      retry: false,
    },
  );

  // Generate breadcrumbs based on current pathname
  const breadcrumbs = useMemo(() => {
    if (!isOrgPage) return undefined;
    return generateBreadcrumbs(
      pathname,
      teamId,
      team?.name,
      orgData?.organization.name,
    );
  }, [isOrgPage, pathname, teamId, team?.name, orgData?.organization.name]);

  // Hide global navbar on landing page
  if (pathname === "/") {
    return null;
  }

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
