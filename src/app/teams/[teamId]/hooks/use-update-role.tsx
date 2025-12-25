"use client";

import { useCallback } from "react";

import { useOptimisticRoleUpdate } from "@/hooks/use-optimistic-role-update";

import { useTeamStore } from "../store/team-store";

export interface UseUpdateRoleOptions {
  teamId: string;
  /** Callback before mutation (e.g., close dialog) */
  onBeforeMutate?: () => void;
}

/**
 * Hook for updating roles from the team canvas context.
 * Wraps the shared optimistic update hook with canvas-specific behavior:
 * - Calls onBeforeMutate callback
 * - Marks canvas as dirty for auto-save
 */
export function useUpdateRole({
  teamId,
  onBeforeMutate,
}: UseUpdateRoleOptions) {
  const markDirty = useTeamStore((state) => state.markDirty);
  const updateRole = useOptimisticRoleUpdate(teamId);

  const mutate = useCallback(
    (
      variables: Parameters<typeof updateRole.mutate>[0],
      options?: Parameters<typeof updateRole.mutate>[1],
    ) => {
      onBeforeMutate?.();
      markDirty();
      updateRole.mutate(variables, options);
    },
    [onBeforeMutate, markDirty, updateRole],
  );

  const mutateAsync = useCallback(
    async (
      variables: Parameters<typeof updateRole.mutateAsync>[0],
      options?: Parameters<typeof updateRole.mutateAsync>[1],
    ) => {
      onBeforeMutate?.();
      markDirty();
      return updateRole.mutateAsync(variables, options);
    },
    [onBeforeMutate, markDirty, updateRole],
  );

  return {
    ...updateRole,
    mutate,
    mutateAsync,
  };
}
