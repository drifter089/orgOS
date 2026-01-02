"use client";

import { useCallback } from "react";

import type { Cadence } from "@prisma/client";
import { toast } from "sonner";

import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import { api } from "@/trpc/react";

interface UseMetricDrawerMutationsProps {
  metricId: string;
  metricName: string;
  teamId: string;
  isIntegrationMetric: boolean;
  onClose: () => void;
}

export function useMetricDrawerMutations({
  metricId,
  metricName,
  teamId,
  isIntegrationMetric,
  onClose,
}: UseMetricDrawerMutationsProps) {
  const { confirm } = useConfirmation();
  const utils = api.useUtils();

  // Shared optimistic update helper for pipeline mutations
  // Returns snapshot for potential rollback
  const setOptimisticProcessing = useCallback(
    async (id: string) => {
      // Cancel outgoing refetches to avoid race conditions
      await utils.dashboard.getDashboardCharts.cancel({ teamId });

      // Snapshot current state for rollback
      const previousCharts = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Optimistically set processing state (instant UI feedback)
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === id
            ? {
                ...dc,
                metric: { ...dc.metric, refreshStatus: "processing" as const },
              }
            : dc,
        ),
      );

      return { previousCharts };
    },
    [utils, teamId],
  );

  // Refresh mutations: optimistic update + polling pattern
  // - onMutate: Sets refreshStatus immediately (instant UI feedback) with rollback snapshot
  // - onSuccess: No invalidate (would wipe optimistic state & race with background task)
  // - onError: Rollback to previous state
  // - useDashboardCharts polls every 3s while any metric is processing

  const refreshMutation = api.pipeline.refresh.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousCharts) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousCharts,
        );
      }
      toast.error("Refresh failed", { description: err.message });
    },
  });

  const regenerateMutation = api.pipeline.regenerate.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousCharts) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousCharts,
        );
      }
      toast.error("Regenerate failed", { description: err.message });
    },
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onError: (err, _variables, context) => {
      // Rollback on error
      if (context?.previousCharts) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousCharts,
        );
      }
      toast.error("Chart update failed", { description: err.message });
    },
  });

  const deleteMutation = api.metric.delete.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      void utils.role.getByTeamId.invalidate({ teamId });
    },
    onError: (err) =>
      toast.error("Delete failed", { description: err.message }),
  });

  const updateMutation = api.metric.update.useMutation({
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Update failed", { description: err.message }),
  });

  // Handlers
  const handleRefresh = useCallback(
    (forceRebuild = false) => {
      if (!isIntegrationMetric || forceRebuild) {
        regenerateMutation.mutate({ metricId });
      } else {
        refreshMutation.mutate({ metricId });
      }
    },
    [metricId, isIntegrationMetric, refreshMutation, regenerateMutation],
  );

  const handleDelete = useCallback(async () => {
    // Close the drawer first, then show confirmation dialog
    onClose();

    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metricName}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id: metricId });
    }
  }, [metricName, metricId, confirm, deleteMutation, onClose]);

  const handleUpdateMetric = useCallback(
    (name: string, description: string) => {
      updateMutation.mutate({
        id: metricId,
        name,
        description: description || undefined,
      });
    },
    [metricId, updateMutation],
  );

  const handleRegenerateChart = useCallback(
    (chartType: string, cadence: Cadence, selectedDimension?: string) => {
      regenerateChartMutation.mutate({
        metricId,
        chartType,
        cadence,
        selectedDimension,
      });
    },
    [metricId, regenerateChartMutation],
  );

  return {
    isDeleting: deleteMutation.isPending,
    handleRefresh,
    handleDelete,
    handleUpdateMetric,
    handleRegenerateChart,
  };
}
