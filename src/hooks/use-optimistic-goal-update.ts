"use client";

import type { GoalType } from "@prisma/client";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

/**
 * Shared hook for goal updates with optimistic updates on dashboard cache.
 *
 * Pattern:
 * 1. onMutate: Show processing state immediately (instant UI feedback)
 * 2. onSuccess: Update with real data from server + clear processing
 * 3. onError: Rollback to previous state
 *
 * This provides immediate processing indicators everywhere without invalidating
 * the entire dashboard query (which would refetch all charts).
 *
 * Use this everywhere goal mutations happen:
 * - Goal tab in metric drawer (goal-tab-content.tsx)
 */
export function useOptimisticGoalUpdate(teamId: string, metricId: string) {
  const utils = api.useUtils();

  const upsertMutation = api.goal.upsert.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches to avoid race conditions
      await utils.dashboard.getDashboardCharts.cancel({ teamId });

      // Snapshot current state for rollback
      const previousCharts = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Optimistically set processing state (instant UI feedback)
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((chart: DashboardChart) => {
          if (chart.metricId === metricId) {
            return {
              ...chart,
              metric: {
                ...chart.metric,
                refreshStatus: "processing" as const,
              },
            };
          }
          return chart;
        });
      });

      return { previousCharts };
    },

    onSuccess: (response, _variables, context) => {
      // Update dashboard cache with server response (includes recalculated goalProgress)
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((chart: DashboardChart) => {
          if (chart.metricId === metricId) {
            return {
              ...chart,
              metric: {
                ...chart.metric,
                goal: response.goal,
                refreshStatus: null, // Clear processing state
              },
              goalProgress: response.goalProgress,
            };
          }
          return chart;
        });
      });

      // Also invalidate goal.get for any other consumers
      void utils.goal.get.invalidate({ metricId });

      toast.success("Goal saved");
    },

    onError: (error, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousCharts) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousCharts,
        );
      }

      toast.error("Failed to save goal", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  const deleteMutation = api.goal.delete.useMutation({
    onMutate: async () => {
      // Cancel outgoing refetches
      await utils.dashboard.getDashboardCharts.cancel({ teamId });

      // Snapshot current state for rollback
      const previousCharts = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Optimistically set processing state (instant UI feedback)
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((chart: DashboardChart) => {
          if (chart.metricId === metricId) {
            return {
              ...chart,
              metric: {
                ...chart.metric,
                refreshStatus: "processing" as const,
              },
            };
          }
          return chart;
        });
      });

      return { previousCharts };
    },

    onSuccess: (response) => {
      // Update dashboard cache - remove goal and goalProgress
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return old;
        return old.map((chart: DashboardChart) => {
          if (chart.metricId === response.metricId) {
            return {
              ...chart,
              metric: {
                ...chart.metric,
                goal: null,
                refreshStatus: null, // Clear processing state
              },
              goalProgress: null,
            };
          }
          return chart;
        });
      });

      // Also invalidate goal.get for any other consumers
      void utils.goal.get.invalidate({ metricId });

      toast.success("Goal deleted");
    },

    onError: (error, _variables, context) => {
      // Rollback to previous state on error
      if (context?.previousCharts) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousCharts,
        );
      }

      toast.error("Failed to delete goal", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  return {
    upsertGoal: (goalType: GoalType, targetValue: number) => {
      upsertMutation.mutate({ metricId, goalType, targetValue });
    },
    deleteGoal: () => {
      deleteMutation.mutate({ metricId });
    },
    isUpserting: upsertMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPending: upsertMutation.isPending || deleteMutation.isPending,
  };
}
