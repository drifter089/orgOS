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

  // Track recently created metrics (skip "Chart updated" toast for these)
  const recentlyCreatedRef = useRef<Set<string>>(new Set());

  // Track metrics awaiting fresh data (completed processing, waiting for refetch)
  // Map of metricId -> timestamp when added (for timeout)
  const [awaitingDataMap, setAwaitingDataMap] = useState<Map<string, number>>(
    () => new Map(),
  );

  // Track timeout IDs for cleanup on unmount
  const timeoutIdsRef = useRef<NodeJS.Timeout[]>([]);

  // Max time to wait for data before giving up (prevents infinite loading)
  const AWAITING_DATA_TIMEOUT_MS = 10000;

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

      // Mark successful metrics as awaiting fresh data (keeps processing UI until data arrives)
      // Error metrics don't need to wait for data
      if (completedIds.length > 0) {
        const now = Date.now();
        setAwaitingDataMap((prev) => {
          const next = new Map(prev);
          completedIds.forEach((id) => next.set(id, now));
          return next;
        });
      }

      // Show error toast immediately (no need to wait for data)
      if (errorIds.length > 0) {
        const errors = errorIds
          .map((id) => statusMap[id]?.lastError)
          .filter(Boolean);
        toast.error("Pipeline failed", {
          description: errors[0] ?? "Unknown error",
          duration: 10000,
        });
      }
      // Success toast is deferred until data arrives (see awaitingDataIds effect)

      // Invalidate cache, then stop polling (but keep awaitingDataIds until data arrives)
      void utils.dashboard.getDashboardCharts
        .invalidate({ teamId })
        .finally(() => {
          setPollingMetricIds((prev) => {
            const next = new Set(prev);
            allIds.forEach((id) => next.delete(id));
            return next;
          });
        });

      // Clear refs after delay to prevent re-triggering
      const timeoutId = setTimeout(() => {
        allIds.forEach((id) => {
          completedRef.current.delete(id);
          recentlyCreatedRef.current.delete(id);
        });
        timeoutIdsRef.current = timeoutIdsRef.current.filter(
          (id) => id !== timeoutId,
        );
      }, 2000);
      timeoutIdsRef.current.push(timeoutId);
    }
  }, [statusMap, teamId, utils]);

  // ---------------------------------------------------------------------------
  // Periodic timeout check for awaiting metrics
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (awaitingDataMap.size === 0) return;

    // Check every 2 seconds for timeouts
    const intervalId = setInterval(() => {
      const now = Date.now();
      const timedOutIds: string[] = [];

      for (const [metricId, addedAt] of awaitingDataMap) {
        if (now - addedAt > AWAITING_DATA_TIMEOUT_MS) {
          timedOutIds.push(metricId);
        }
      }

      if (timedOutIds.length > 0) {
        console.info(
          "[PipelineStatus] Timed out waiting for chart data:",
          timedOutIds,
        );
        setAwaitingDataMap((prev) => {
          const next = new Map(prev);
          timedOutIds.forEach((id) => next.delete(id));
          return next;
        });
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [awaitingDataMap, AWAITING_DATA_TIMEOUT_MS]);

  // ---------------------------------------------------------------------------
  // Detect when fresh data has arrived for awaiting metrics
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (awaitingDataMap.size === 0) return;

    const now = Date.now();
    const idsToRemove: string[] = [];
    const idsWithData: string[] = [];

    for (const [metricId, addedAt] of awaitingDataMap) {
      const chart = dashboardCharts.find((dc) => dc.metric.id === metricId);

      // Case 1: Metric no longer exists (deleted while processing)
      if (!chart) {
        idsToRemove.push(metricId);
        continue;
      }

      // Case 2: Chart has data - success!
      const hasData =
        chart.chartConfig &&
        typeof chart.chartConfig === "object" &&
        "chartData" in chart.chartConfig &&
        Array.isArray(chart.chartConfig.chartData) &&
        chart.chartConfig.chartData.length > 0;

      if (hasData) {
        idsWithData.push(metricId);
        idsToRemove.push(metricId);
        continue;
      }

      // Case 3: Chart exists with empty/null config but metric is done processing
      // (processing succeeded but no data points were generated)
      const metricDoneWithNoData =
        !chart.metric.refreshStatus && !chart.metric.lastError;
      if (metricDoneWithNoData) {
        // Give a short grace period for cache to update, then give up
        if (now - addedAt > AWAITING_DATA_TIMEOUT_MS / 2) {
          idsToRemove.push(metricId);
          continue;
        }
      }
    }

    // Show success toast for metrics that got data
    if (idsWithData.length > 0) {
      const nonRecentlyCreated = idsWithData.filter(
        (id) => !recentlyCreatedRef.current.has(id),
      );
      if (nonRecentlyCreated.length > 0) {
        toast.success("Chart updated successfully");
      }
    }

    // Remove all processed IDs
    if (idsToRemove.length > 0) {
      setAwaitingDataMap((prev) => {
        const next = new Map(prev);
        idsToRemove.forEach((id) => next.delete(id));
        return next;
      });
    }
  }, [awaitingDataMap, dashboardCharts, AWAITING_DATA_TIMEOUT_MS]);

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
      // If awaiting fresh data after completion, show "loading" state
      // This prevents jitter between completion and data arrival
      if (awaitingDataMap.has(metricId)) {
        return {
          isProcessing: true,
          step: "loading-data",
          error: null,
        };
      }

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
    [awaitingDataMap, pollingMetricIds, statusMap, dashboardCharts],
  );

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------
  const createMutation = api.metric.create.useMutation({
    onSuccess: (result) => {
      recentlyCreatedRef.current.add(result.metricId);
      startPolling(result.metricId);

      // Optimistic update to prevent card flicker
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
      recentlyCreatedRef.current.add(result.metricId);
      startPolling(result.metricId);

      // Optimistic update to prevent card flicker
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
