"use client";

import { useMemo } from "react";

import { api } from "@/trpc/react";

/**
 * Hook to get role data from the TanStack Query cache.
 * This version accepts teamId as a parameter, making it usable outside the canvas context.
 *
 * @param teamId - The team ID to fetch roles for
 * @param roleId - The role ID to look up
 * @returns The role data from cache, or undefined if not found/loading
 */
export function useRoleData(teamId: string, roleId: string) {
  const { data: roles } = api.role.getByTeamId.useQuery(
    { teamId },
    { enabled: !!teamId && !!roleId },
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
 * @param teamId - The team ID to fetch roles for
 * @param roleId - The role ID to look up
 * @returns Object with data, isLoading, and isError states
 */
export function useRoleDataWithStatus(teamId: string, roleId: string) {
  const {
    data: roles,
    isLoading,
    isError,
  } = api.role.getByTeamId.useQuery(
    { teamId },
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
