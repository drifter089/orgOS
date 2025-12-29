"use client";

import { toast } from "sonner";

import { getUserDisplayName } from "@/lib/helpers/get-user-name";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

/**
 * Shared hook for role updates with optimistic updates on both caches.
 * Use this everywhere role-metric assignment happens:
 * - Role dialog (use-update-role.tsx)
 * - Chart drawer role tab (role-assignment.tsx)
 * - Canvas KPI edges (use-role-metric-sync.ts)
 */
export function useOptimisticRoleUpdate(teamId: string) {
  const utils = api.useUtils();

  return api.role.update.useMutation({
    onMutate: async (variables) => {
      await utils.role.getByTeamId.cancel({ teamId });
      await utils.dashboard.getDashboardCharts.cancel({ teamId });

      const previousRoles = utils.role.getByTeamId.getData({ teamId });
      const previousDashboard = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      const updatedRole = previousRoles?.find((r) => r.id === variables.id);
      const oldMetricId = updatedRole?.metricId;
      // Only use new metricId if explicitly provided, otherwise keep existing
      const metricIdProvided = "metricId" in variables;
      const newMetricId = metricIdProvided
        ? (variables.metricId ?? null)
        : updatedRole?.metricId;

      const metrics = utils.metric.getByTeamId.getData({ teamId });
      const selectedMetric = newMetricId
        ? metrics?.find((m) => m.id === newMetricId)
        : null;

      // Get members for name lookup when assignedUserId changes
      const members = utils.organization.getMembers.getData() ?? [];
      const assignedUserIdProvided = "assignedUserId" in variables;
      const newAssignedUserId: string | null = assignedUserIdProvided
        ? (variables.assignedUserId ?? null)
        : (updatedRole?.assignedUserId ?? null);
      const newAssignedUserName: string | null = assignedUserIdProvided
        ? getUserDisplayName(newAssignedUserId, members)
        : (updatedRole?.assignedUserName ?? null);

      // Update role cache
      utils.role.getByTeamId.setData({ teamId }, (old) =>
        old?.map((role) =>
          role.id === variables.id
            ? {
                ...role,
                title: variables.title ?? role.title,
                purpose: variables.purpose ?? role.purpose,
                accountabilities:
                  variables.accountabilities ?? role.accountabilities,
                metricId: metricIdProvided
                  ? (variables.metricId ?? null)
                  : role.metricId,
                assignedUserId: newAssignedUserId,
                assignedUserName: newAssignedUserName,
                color: variables.color ?? role.color,
                metric: metricIdProvided
                  ? selectedMetric
                    ? { ...selectedMetric, dashboardCharts: [] }
                    : null
                  : role.metric,
                effortPoints:
                  variables.effortPoints !== undefined
                    ? variables.effortPoints
                    : role.effortPoints,
              }
            : role,
        ),
      );

      // Update dashboard cache - move role between metrics
      if (metricIdProvided && oldMetricId !== newMetricId && updatedRole) {
        // Create plain role object for dashboard cache (strip metric relation)
        // newMetricId is guaranteed to be string | null here (not undefined) because metricIdProvided is true
        const roleForDashboard = {
          id: updatedRole.id,
          title: variables.title ?? updatedRole.title,
          color: variables.color ?? updatedRole.color,
          teamId: updatedRole.teamId,
          createdAt: updatedRole.createdAt,
          updatedAt: updatedRole.updatedAt,
          purpose: variables.purpose ?? updatedRole.purpose,
          accountabilities:
            variables.accountabilities ?? updatedRole.accountabilities,
          metricId: newMetricId ?? null,
          nodeId: updatedRole.nodeId,
          assignedUserId: newAssignedUserId,
          effortPoints:
            variables.effortPoints !== undefined
              ? variables.effortPoints
              : updatedRole.effortPoints,
          assignedUserName: newAssignedUserName,
        };

        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
          if (!old) return old;
          return old.map((chart: DashboardChart) => {
            if (chart.metricId === oldMetricId) {
              return {
                ...chart,
                metric: {
                  ...chart.metric,
                  roles: chart.metric.roles.filter(
                    (r) => r.id !== variables.id,
                  ),
                },
              };
            }
            if (chart.metricId === newMetricId) {
              return {
                ...chart,
                metric: {
                  ...chart.metric,
                  roles: [...chart.metric.roles, roleForDashboard],
                },
              };
            }
            return chart;
          });
        });
      } else if (updatedRole?.metricId) {
        // Update role in-place on dashboard cache (no metric change)
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
          if (!old) return old;
          return old.map((chart: DashboardChart) => {
            if (chart.metricId === updatedRole.metricId) {
              return {
                ...chart,
                metric: {
                  ...chart.metric,
                  roles: chart.metric.roles.map((r) =>
                    r.id === variables.id
                      ? {
                          ...r,
                          title: variables.title ?? r.title,
                          purpose: variables.purpose ?? r.purpose,
                          accountabilities:
                            variables.accountabilities ?? r.accountabilities,
                          color: variables.color ?? r.color,
                          assignedUserId: newAssignedUserId,
                          assignedUserName: newAssignedUserName,
                          effortPoints:
                            variables.effortPoints !== undefined
                              ? variables.effortPoints
                              : r.effortPoints,
                        }
                      : r,
                  ),
                },
              };
            }
            return chart;
          });
        });
      }

      return { previousRoles, previousDashboard };
    },

    onSuccess: (updatedRole) => {
      // Immediately update role cache with server response
      // This ensures correct data even before Prisma Accelerate cache propagates
      utils.role.getByTeamId.setData({ teamId }, (old) => {
        if (!old) return [updatedRole];
        return old.map((role) =>
          role.id === updatedRole.id ? updatedRole : role,
        );
      });

      // Destructure to exclude relations - dashboard cache expects plain Role type
      const { metric: _metric, team: _team, ...roleForCache } = updatedRole;

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((chart) => {
          // Add/update role to target metric
          if (chart.metricId === updatedRole.metricId) {
            const roleExists = chart.metric.roles.some(
              (r) => r.id === updatedRole.id,
            );
            return {
              ...chart,
              metric: {
                ...chart.metric,
                roles: roleExists
                  ? chart.metric.roles.map((r) =>
                      r.id === updatedRole.id ? roleForCache : r,
                    )
                  : [...chart.metric.roles, roleForCache],
              },
            };
          }
          // Remove role from old metric if it was moved
          if (chart.metric.roles.some((r) => r.id === updatedRole.id)) {
            return {
              ...chart,
              metric: {
                ...chart.metric,
                roles: chart.metric.roles.filter(
                  (r) => r.id !== updatedRole.id,
                ),
              },
            };
          }
          return chart;
        });
      });

      // Delayed invalidation for eventual consistency
      // Wait for Prisma Accelerate cache propagation before background refresh
      setTimeout(() => {
        void utils.role.getByTeamId.invalidate({ teamId });
        void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      }, 5000);
    },

    onError: (error, _vars, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeamId.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousDashboard) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousDashboard,
        );
      }
      toast.error("Failed to update role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });
}
