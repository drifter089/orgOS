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

  const setOptimisticProcessing = useCallback(
    (id: string) => {
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === id
            ? { ...dc, metric: { ...dc.metric, refreshStatus: "processing" } }
            : dc,
        ),
      );
    },
    [utils, teamId],
  );

  const refreshMutation = api.pipeline.refresh.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Refresh failed", { description: err.message }),
  });

  const regenerateMutation = api.pipeline.regenerate.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Regenerate failed", { description: err.message }),
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: () => setOptimisticProcessing(metricId),
    onSuccess: () => utils.dashboard.getDashboardCharts.invalidate({ teamId }),
    onError: (err) =>
      toast.error("Chart update failed", { description: err.message }),
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
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${metricName}"? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      deleteMutation.mutate({ id: metricId });
      onClose();
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
