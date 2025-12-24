"use client";

import { createContext, useCallback, useContext, useMemo } from "react";

import type { Cadence } from "@prisma/client";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface PipelineStatusContextValue {
  // Data
  dashboardCharts: DashboardChartWithRelations[];
  isLoading: boolean;
  isError: boolean;

  // Simple status check
  isProcessing: (metricId: string) => boolean;
  getError: (metricId: string) => string | null;

  // Mutations
  createMetric: (data: {
    templateId: string;
    connectionId: string;
    name: string;
    description?: string;
    endpointParams: Record<string, string>;
    teamId?: string;
  }) => Promise<void>;

  createManualMetric: (data: {
    name: string;
    description?: string;
    unitType: "number" | "percentage";
    cadence: "daily" | "weekly" | "monthly";
    teamId: string;
  }) => Promise<void>;

  deleteMetric: (id: string) => Promise<void>;
  updateMetric: (
    id: string,
    data: { name?: string; description?: string },
  ) => Promise<void>;
  refreshMetric: (metricId: string) => Promise<void>;
  regenerateMetric: (metricId: string) => Promise<void>;
  regenerateChart: (
    metricId: string,
    options: {
      chartType?: string;
      cadence?: Cadence;
      selectedDimension?: string;
    },
  ) => Promise<void>;

  // Loading states
  isCreating: boolean;
  isDeleting: boolean;
}

const PipelineStatusContext = createContext<PipelineStatusContextValue | null>(
  null,
);

interface PipelineStatusProviderProps {
  teamId: string;
  children: React.ReactNode;
}

export function PipelineStatusProvider({
  teamId,
  children,
}: PipelineStatusProviderProps) {
  const utils = api.useUtils();

  // Dashboard query with conditional refetch - polls every 3s while processing
  const {
    data: dashboardCharts = [],
    isLoading,
    isError,
  } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    {
      refetchInterval: (query) => {
        const charts = query.state.data;
        const anyProcessing = charts?.some(
          (dc) => dc.metric.refreshStatus !== null,
        );
        return anyProcessing ? 3000 : false;
      },
    },
  );

  const isProcessing = useCallback(
    (metricId: string): boolean => {
      const chart = dashboardCharts.find((dc) => dc.metric.id === metricId);
      return !!chart?.metric.refreshStatus;
    },
    [dashboardCharts],
  );

  const getError = useCallback(
    (metricId: string): string | null => {
      const chart = dashboardCharts.find((dc) => dc.metric.id === metricId);
      if (chart?.metric.refreshStatus) return null;
      return chart?.metric.lastError ?? null;
    },
    [dashboardCharts],
  );

  const createMutation = api.metric.create.useMutation({
    onSuccess: (result) => {
      const enrichedResult = {
        ...result,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        metric: { ...result.metric, goal: null },
      } as DashboardChartWithRelations;

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return [enrichedResult];
        if (old.some((dc) => dc.id === result.id)) return old;
        return [...old, enrichedResult];
      });
    },
  });

  const createManualMutation = api.manualMetric.create.useMutation({
    onSuccess: (result) => {
      const enrichedResult = {
        ...result,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        chartTransformer: null,
        metric: { ...result.metric, goal: null },
      } as DashboardChartWithRelations;

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return [enrichedResult];
        if (old.some((dc) => dc.id === result.id)) return old;
        return [...old, enrichedResult];
      });
    },
  });

  const deleteMutation = api.metric.delete.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getDashboardCharts.invalidate({ teamId });
    },
  });

  const updateMutation = api.metric.update.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getDashboardCharts.invalidate({ teamId });
    },
  });

  const refreshMutation = api.pipeline.refresh.useMutation({
    onMutate: ({ metricId }) => {
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === metricId
            ? { ...dc, metric: { ...dc.metric, refreshStatus: "processing" } }
            : dc,
        ),
      );
    },
  });

  const regenerateMutation = api.pipeline.regenerate.useMutation({
    onMutate: ({ metricId }) => {
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === metricId
            ? { ...dc, metric: { ...dc.metric, refreshStatus: "processing" } }
            : dc,
        ),
      );
    },
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: ({ metricId }) => {
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === metricId
            ? { ...dc, metric: { ...dc.metric, refreshStatus: "processing" } }
            : dc,
        ),
      );
    },
  });

  const createMetric = useCallback(
    async (data: Parameters<PipelineStatusContextValue["createMetric"]>[0]) => {
      await createMutation.mutateAsync({ ...data, teamId });
    },
    [createMutation, teamId],
  );

  const createManualMetric = useCallback(
    async (
      data: Parameters<PipelineStatusContextValue["createManualMetric"]>[0],
    ) => {
      await createManualMutation.mutateAsync(data);
    },
    [createManualMutation],
  );

  const deleteMetric = useCallback(
    async (id: string) => {
      await deleteMutation.mutateAsync({ id });
    },
    [deleteMutation],
  );

  const updateMetric = useCallback(
    async (id: string, data: { name?: string; description?: string }) => {
      await updateMutation.mutateAsync({ id, ...data });
    },
    [updateMutation],
  );

  const refreshMetric = useCallback(
    async (metricId: string) => {
      try {
        await refreshMutation.mutateAsync({ metricId });
      } catch (error) {
        toast.error("Refresh failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [refreshMutation],
  );

  const regenerateMetric = useCallback(
    async (metricId: string) => {
      try {
        await regenerateMutation.mutateAsync({ metricId });
      } catch (error) {
        toast.error("Regenerate failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [regenerateMutation],
  );

  const regenerateChart = useCallback(
    async (
      metricId: string,
      options: {
        chartType?: string;
        cadence?: Cadence;
        selectedDimension?: string;
      },
    ) => {
      try {
        await regenerateChartMutation.mutateAsync({ metricId, ...options });
      } catch (error) {
        toast.error("Chart update failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      }
    },
    [regenerateChartMutation],
  );

  const value = useMemo<PipelineStatusContextValue>(
    () => ({
      dashboardCharts,
      isLoading,
      isError,
      isProcessing,
      getError,
      createMetric,
      createManualMetric,
      deleteMetric,
      updateMetric,
      refreshMetric,
      regenerateMetric,
      regenerateChart,
      isCreating: createMutation.isPending || createManualMutation.isPending,
      isDeleting: deleteMutation.isPending,
    }),
    [
      dashboardCharts,
      isLoading,
      isError,
      isProcessing,
      getError,
      createMetric,
      createManualMetric,
      deleteMetric,
      updateMetric,
      refreshMetric,
      regenerateMetric,
      regenerateChart,
      createMutation.isPending,
      createManualMutation.isPending,
      deleteMutation.isPending,
    ],
  );

  return (
    <PipelineStatusContext.Provider value={value}>
      {children}
    </PipelineStatusContext.Provider>
  );
}

export function usePipelineStatus() {
  const context = useContext(PipelineStatusContext);
  if (!context) {
    throw new Error(
      "usePipelineStatus must be used within PipelineStatusProvider",
    );
  }
  return context;
}
