"use client";

import { toast } from "sonner";

import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";

export interface UseUpdateRoleOptions {
  teamId: string;
  /** Callback before mutation (e.g., close dialog) */
  onBeforeMutate?: () => void;
}

/**
 * Shared hook for updating roles with optimistic updates.
 * Only updates the role cache - node data doesn't need to change
 * since RoleNode fetches display data from cache via useRoleData hook.
 */
export function useUpdateRole({
  teamId,
  onBeforeMutate,
}: UseUpdateRoleOptions) {
  const markDirty = useTeamStore((state) => state.markDirty);
  const utils = api.useUtils();

  return api.role.update.useMutation({
    onMutate: async (variables) => {
      onBeforeMutate?.();

      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });

      // Optimistically update the role cache
      // RoleNode component reads from cache, so this updates UI automatically
      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((role) =>
          role.id === variables.id
            ? {
                ...role,
                title: variables.title ?? role.title,
                purpose: variables.purpose ?? role.purpose,
                accountabilities: variables.accountabilities ?? null,
                metricId: variables.metricId ?? null,
                assignedUserId: variables.assignedUserId ?? null,
                color: variables.color ?? role.color,
                metric: null, // Will be populated on success
                effortPoints:
                  variables.effortPoints !== undefined
                    ? variables.effortPoints
                    : role.effortPoints,
              }
            : role,
        );
      });

      markDirty();

      return { previousRoles };
    },
    onSuccess: (updatedRole) => {
      // Invalidate team.getById cache to ensure fresh data on next fetch
      void utils.team.getById.invalidate({ id: teamId });

      // Update role cache with server response (includes metric relation)
      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [updatedRole];
        return old.map((role) =>
          role.id === updatedRole.id ? updatedRole : role,
        );
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoles !== undefined) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        utils.role.getByTeam.setData({ teamId }, context.previousRoles as any);
      }
      toast.error("Failed to update role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });
}
