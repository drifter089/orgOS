"use client";

import { toast } from "sonner";

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
      const newMetricId = variables.metricId;

      const metrics = utils.metric.getByTeamId.getData({ teamId });
      const selectedMetric = newMetricId
        ? metrics?.find((m) => m.id === newMetricId)
        : null;

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
                metricId: newMetricId ?? null,
                assignedUserId: variables.assignedUserId ?? role.assignedUserId,
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
        ),
      );

      // Update dashboard cache - move role between metrics
      if (oldMetricId !== newMetricId && updatedRole) {
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
                  roles: [
                    ...chart.metric.roles,
                    {
                      ...updatedRole,
                      metricId: newMetricId,
                    },
                  ],
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

      // Update dashboard cache with server response (exclude relations for type safety)
      const roleForCache = {
        id: updatedRole.id,
        title: updatedRole.title,
        color: updatedRole.color,
        teamId: updatedRole.teamId,
        createdAt: updatedRole.createdAt,
        updatedAt: updatedRole.updatedAt,
        purpose: updatedRole.purpose,
        accountabilities: updatedRole.accountabilities,
        metricId: updatedRole.metricId,
        nodeId: updatedRole.nodeId,
        assignedUserId: updatedRole.assignedUserId,
        effortPoints: updatedRole.effortPoints,
        assignedUserName: updatedRole.assignedUserName,
      };

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

      // Invalidate for background refresh
      void utils.role.getByTeamId.invalidate({ teamId });
      void utils.dashboard.getDashboardCharts.invalidate({ teamId });
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
