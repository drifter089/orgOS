"use client";

import { useMemo } from "react";

import { api } from "@/trpc/react";

import { useTeamStoreOptional } from "../store/team-store";

/**
 * Hook to get role data from the TanStack Query cache.
 * This allows role nodes to display data without storing it in node.data,
 * eliminating the dual source of truth issue.
 *
 * @param roleId - The role ID to look up
 * @returns The role data from cache, or undefined if not found/loading
 */
export function useRoleData(roleId: string) {
  const teamId = useTeamStoreOptional((state) => state.teamId);
  const { data: roles } = api.role.getByTeamId.useQuery(
    { teamId: teamId ?? "" },
    { enabled: !!teamId },
  );

  return useMemo(
    () => roles?.find((role) => role.id === roleId),
    [roles, roleId],
  );
}

/**
 * Hook to get role data with loading and error states.
 * Use this in components that need to handle loading/error UI (e.g., dialogs).
 *
 * @param roleId - The role ID to look up
 * @returns Object with data, isLoading, and isError states
 */
export function useRoleDataWithStatus(roleId: string) {
  const teamId = useTeamStoreOptional((state) => state.teamId);
  const {
    data: roles,
    isLoading,
    isError,
  } = api.role.getByTeamId.useQuery(
    { teamId: teamId ?? "" },
    { enabled: !!teamId && !!roleId },
  );

  const data = useMemo(
    () => roles?.find((role) => role.id === roleId),
    [roles, roleId],
  );

  return { data, isLoading, isError };
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
