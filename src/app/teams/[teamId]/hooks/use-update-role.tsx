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

      await utils.role.getByTeamId.cancel({ teamId });

      const previousRoles = utils.role.getByTeamId.getData({ teamId });

      // Look up metric from cache for optimistic display
      const metrics = utils.metric.getByTeamId.getData({ teamId });
      const selectedMetric = variables.metricId
        ? metrics?.find((m) => m.id === variables.metricId)
        : null;

      utils.role.getByTeamId.setData({ teamId }, (old) => {
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
                metric: selectedMetric
                  ? { ...selectedMetric, dashboardCharts: [] }
                  : null,
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
      utils.role.getByTeamId.setData({ teamId }, (old) => {
        if (!old) return [updatedRole];
        return old.map((role) =>
          role.id === updatedRole.id ? updatedRole : role,
        );
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoles !== undefined) {
        utils.role.getByTeamId.setData(
          { teamId },
          context.previousRoles as Parameters<
            typeof utils.role.getByTeamId.setData
          >[1],
        );
      }
      toast.error("Failed to update role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });
}
