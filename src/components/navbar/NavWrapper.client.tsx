"use client";

import { usePathname } from "next/navigation";

import { api } from "@/trpc/react";

import { SimplePillNav } from "./SimplePillNav";

interface NavWrapperProps {
  user: {
    id: string;
    firstName?: string | null;
  } | null;
  signOutAction: () => Promise<void>;
}

export function NavWrapper({ user, signOutAction }: NavWrapperProps) {
  const pathname = usePathname();

  // Fetch all teams for the dropdown (only when authenticated)
  const { data: teams } = api.team.getAll.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  // Fetch organization data (only when authenticated)
  const { data: orgData } = api.organization.getCurrent.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });

  // Hide navbar on landing page and mission page (they have their own headers)
  if (pathname === "/" || pathname === "/mission") {
    return null;
  }

  return (
    <SimplePillNav
      user={user}
      signOutAction={signOutAction}
      teams={teams ?? []}
      orgName={orgData?.organization.name}
    />
  );
}
