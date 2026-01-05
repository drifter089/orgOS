"use client";

import type { GoalType } from "@prisma/client";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

/**
 * Shared hook for goal updates with optimistic updates on dashboard cache.
 *
 * Unlike other mutations, goal changes do NOT invalidate the dashboard query.
 * Instead, we use setData with the server response to update only the affected chart.
 * This avoids refetching all dashboard charts when only a goal changed.
 *
 * Use this everywhere goal mutations happen:
 * - Goal tab in metric drawer (goal-tab-content.tsx)
 */
export function useOptimisticGoalUpdate(teamId: string, metricId: string) {
  const utils = api.useUtils();

  const upsertMutation = api.goal.upsert.useMutation({
    onSuccess: (response) => {
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
    onError: (error) => {
      toast.error("Failed to save goal", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  const deleteMutation = api.goal.delete.useMutation({
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
    onError: (error) => {
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
