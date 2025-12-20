"use client";

import { useMemo } from "react";

import type { RouterOutputs } from "@/trpc/react";

import { usePublicView } from "../_context/public-view-context";

type PublicTeamData = NonNullable<
  RouterOutputs["publicView"]["getTeamByShareToken"]
>;
type PublicRoleData = PublicTeamData["roles"][number];

export function usePublicRoleData(roleId: string): PublicRoleData | undefined {
  const { team } = usePublicView();

  return useMemo(
    () => team?.roles.find((role) => role.id === roleId),
    [team?.roles, roleId],
  );
}

export function usePublicUserName(
  _userId: string | null | undefined,
): string | undefined {
  return undefined;
}

// Re-export the role type for use in components
export type { PublicRoleData };
