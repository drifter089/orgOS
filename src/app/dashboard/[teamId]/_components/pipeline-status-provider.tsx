"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { Cadence } from "@prisma/client";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

// =============================================================================
// Types
// =============================================================================

export interface PipelineStatus {
  isProcessing: boolean;
  step: string | null;
  error: string | null;
}

interface PipelineStatusContextValue {
  // Status
  getStatus: (metricId: string) => PipelineStatus;
  startPolling: (metricId: string) => void;

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

// =============================================================================
// Provider
// =============================================================================

interface PipelineStatusProviderProps {
  teamId: string;
  dashboardCharts: DashboardChartWithRelations[];
  children: React.ReactNode;
}

export function PipelineStatusProvider({
  teamId,
  dashboardCharts,
  children,
}: PipelineStatusProviderProps) {
  const utils = api.useUtils();

  // Track which metrics are being polled
  const [pollingMetricIds, setPollingMetricIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Track completed metrics to show toast (prevent double toast)
  const completedRef = useRef<Set<string>>(new Set());

  // Track timeout IDs for cleanup on unmount
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  // ---------------------------------------------------------------------------
  // Auto-start polling for metrics that are already processing on mount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const processingIds = dashboardCharts
      .filter((dc) => dc.metric.refreshStatus)
      .map((dc) => dc.metric.id);

    if (processingIds.length > 0) {
      setPollingMetricIds((prev) => new Set([...prev, ...processingIds]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount - intentionally ignoring dashboardCharts

  // ---------------------------------------------------------------------------
  // Batch Status Polling Query
  // ---------------------------------------------------------------------------
  const pollingArray = useMemo(
    () => Array.from(pollingMetricIds),
    [pollingMetricIds],
  );

  const { data: statusMap } = api.metric.getBatchStatus.useQuery(
    { metricIds: pollingArray },
    {
      enabled: pollingArray.length > 0,
      refetchInterval: 1000, // 1 second
      staleTime: 0,
      refetchOnWindowFocus: false,
    },
  );

  // ---------------------------------------------------------------------------
  // Cleanup timeouts on unmount
  // ---------------------------------------------------------------------------
  useEffect(() => {
    return () => {
      timeoutIdsRef.current.forEach((id) => clearTimeout(id));
      timeoutIdsRef.current = [];
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Completion Detection
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!statusMap) return;

    const completedIds: string[] = [];
    const errorIds: string[] = [];

    for (const [metricId, status] of Object.entries(statusMap)) {
      if (!status.refreshStatus) {
        // Metric is no longer processing
        if (!completedRef.current.has(metricId)) {
          completedRef.current.add(metricId);
          if (status.lastError) {
            errorIds.push(metricId);
          } else {
            completedIds.push(metricId);
          }
        }
      }
    }

    if (completedIds.length > 0 || errorIds.length > 0) {
      const allIds = [...completedIds, ...errorIds];

      // Show toasts immediately
      if (completedIds.length > 0) {
        toast.success("Chart updated successfully");
      }
      if (errorIds.length > 0) {
        const errors = errorIds
          .map((id) => statusMap[id]?.lastError)
          .filter(Boolean);
        toast.error("Pipeline failed", {
          description: errors[0] ?? "Unknown error",
          duration: 10000,
        });
      }

      // Invalidate cache, then stop polling
      void utils.dashboard.getDashboardCharts
        .invalidate({ teamId })
        .finally(() => {
          setPollingMetricIds((prev) => {
            const next = new Set(prev);
            allIds.forEach((id) => next.delete(id));
            return next;
          });
        });

      // Clear from completed ref after a delay to prevent re-triggering
      const timeoutId = setTimeout(() => {
        allIds.forEach((id) => completedRef.current.delete(id));
        // Remove this timeout from tracking
        timeoutIdsRef.current = timeoutIdsRef.current.filter(
          (id) => id !== timeoutId,
        );
      }, 2000);
      timeoutIdsRef.current.push(timeoutId);
    }
  }, [statusMap, teamId, utils]);

  // ---------------------------------------------------------------------------
  // Start Polling
  // ---------------------------------------------------------------------------
  const startPolling = useCallback((metricId: string) => {
    setPollingMetricIds((prev) => new Set([...prev, metricId]));
  }, []);

  // ---------------------------------------------------------------------------
  // Get Status
  // ---------------------------------------------------------------------------
  const getStatus = useCallback(
    (metricId: string): PipelineStatus => {
      // If we're polling this metric, use the polled status
      if (pollingMetricIds.has(metricId) && statusMap?.[metricId]) {
        const status = statusMap[metricId];
        return {
          isProcessing: !!status.refreshStatus,
          step: status.refreshStatus ?? null,
          error: status.lastError ?? null,
        };
      }

      // If we're polling but no data yet, show processing
      if (pollingMetricIds.has(metricId)) {
        return {
          isProcessing: true,
          step: "processing",
          error: null,
        };
      }

      // Fall back to chart data (for initial load before polling starts)
      const chart = dashboardCharts.find((dc) => dc.metric.id === metricId);
      if (chart) {
        return {
          isProcessing: !!chart.metric.refreshStatus,
          step: chart.metric.refreshStatus ?? null,
          error: chart.metric.lastError ?? null,
        };
      }

      return { isProcessing: false, step: null, error: null };
    },
    [pollingMetricIds, statusMap, dashboardCharts],
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const createMutation = api.metric.create.useMutation({
    onSuccess: async (result) => {
      startPolling(result.metricId);
      await utils.dashboard.getDashboardCharts.invalidate({ teamId });
    },
  });

  const createManualMutation = api.manualMetric.create.useMutation({
    onSuccess: async (result) => {
      startPolling(result.metricId);
      await utils.dashboard.getDashboardCharts.invalidate({ teamId });
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

  const stopPolling = useCallback((metricId: string) => {
    setPollingMetricIds((prev) => {
      const next = new Set(prev);
      next.delete(metricId);
      return next;
    });
  }, []);

  const refreshMutation = api.pipeline.refresh.useMutation({
    onMutate: ({ metricId }) => startPolling(metricId),
    onError: (_, { metricId }) => stopPolling(metricId),
  });

  const regenerateMutation = api.pipeline.regenerate.useMutation({
    onMutate: ({ metricId }) => startPolling(metricId),
    onError: (_, { metricId }) => stopPolling(metricId),
  });

  const regenerateChartMutation = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: ({ metricId }) => startPolling(metricId),
    onError: (_, { metricId }) => stopPolling(metricId),
  });

  // ---------------------------------------------------------------------------
  // Mutation Wrappers
  // ---------------------------------------------------------------------------
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
      await refreshMutation.mutateAsync({ metricId });
    },
    [refreshMutation],
  );

  const regenerateMetric = useCallback(
    async (metricId: string) => {
      await regenerateMutation.mutateAsync({ metricId });
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
      await regenerateChartMutation.mutateAsync({ metricId, ...options });
    },
    [regenerateChartMutation],
  );

  // ---------------------------------------------------------------------------
  // Context Value
  // ---------------------------------------------------------------------------
  const value = useMemo<PipelineStatusContextValue>(
    () => ({
      getStatus,
      startPolling,
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
      getStatus,
      startPolling,
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

// =============================================================================
// Hook
// =============================================================================

export function usePipelineStatus() {
  const context = useContext(PipelineStatusContext);
  if (!context) {
    throw new Error(
      "usePipelineStatus must be used within PipelineStatusProvider",
    );
  }
  return context;
}
