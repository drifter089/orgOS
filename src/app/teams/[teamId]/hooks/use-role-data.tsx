"use client";

import { useMemo } from "react";

import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";

/**
 * Hook to get role data from the TanStack Query cache.
 * This allows role nodes to display data without storing it in node.data,
 * eliminating the dual source of truth issue.
 *
 * @param roleId - The role ID to look up
 * @returns The role data from cache, or undefined if not found/loading
 */
export function useRoleData(roleId: string) {
  const teamId = useTeamStore((state) => state.teamId);
  const { data: roles } = api.role.getByTeam.useQuery(
    { teamId },
    { enabled: !!teamId },
  );

  return useMemo(
    () => roles?.find((role) => role.id === roleId),
    [roles, roleId],
  );
}

/**
 * Hook to get user name from the organization members cache.
 *
 * @param userId - The user ID to look up
 * @returns The user's display name, or undefined if not found
 */
export function useUserName(userId: string | null | undefined) {
  const { data: members } = api.organization.getMembers.useQuery(undefined, {
    enabled: !!userId,
  });

  return useMemo(() => {
    if (!userId || !members) return undefined;
    const member = members.find((m) => m.id === userId);
    if (!member) return `User ${userId.substring(0, 8)}`;
    return (
      [member.firstName, member.lastName].filter(Boolean).join(" ") ||
      member.email
    );
  }, [userId, members]);
}
