import { useCallback, useEffect, useRef, useState } from "react";

import type { Cadence } from "@prisma/client";
import { toast } from "sonner";

import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

// =============================================================================
// Types
// =============================================================================

export interface PipelineStatus {
  /** Whether the metric is currently being processed */
  isProcessing: boolean;
  /** Current pipeline step name (e.g., "fetching-api-data") */
  processingStep: string | null;
  /** Whether the metric has an error from the last pipeline run */
  hasError: boolean;
  /** Error message from the last failed pipeline run */
  lastError: string | null;
}

interface UsePipelineOperationsOptions {
  /** Team ID - required for cache operations. If not provided, optimistic updates are skipped. */
  teamId?: string;
  /** Called when pipeline completes (success or error) */
  onComplete?: (result: { success: boolean; error: string | null }) => void;
}

// =============================================================================
// Constants
// =============================================================================

const POLLING_INTERVAL_MS = 500;
const POLLING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const TEMP_ID_PREFIX = "temp-";

// =============================================================================
// Helpers
// =============================================================================

function isTempId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

function createTempId(): string {
  return `${TEMP_ID_PREFIX}${Date.now()}`;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Unified hook for metric pipeline operations.
 *
 * Combines:
 * - Create/delete mutations with optimistic updates
 * - Pipeline operations (refresh, regenerate)
 * - Status polling with automatic cleanup
 *
 * Key design decisions:
 * 1. Mutations are awaited before polling starts (no race conditions)
 * 2. Single polling subscription per metric
 * 3. Optimistic creates use simple temp cards
 * 4. Cache invalidation on completion
 */
export function usePipelineOperations({
  teamId,
  onComplete,
}: UsePipelineOperationsOptions) {
  const utils = api.useUtils();

  const [pollingMetricId, setPollingMetricId] = useState<string | null>(null);
  const pollingStartTimeRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // ---------------------------------------------------------------------------
  // Polling Query
  // ---------------------------------------------------------------------------

  const shouldPoll = !!pollingMetricId && !isTempId(pollingMetricId);

  const { data: polledStatus } = api.metric.getStatus.useQuery(
    { metricId: pollingMetricId! },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  // Handle polling completion
  useEffect(() => {
    if (!shouldPoll || !polledStatus) return;

    if (!polledStatus.refreshStatus) {
      const hasError = !!polledStatus.lastError;

      setPollingMetricId(null);
      pollingStartTimeRef.current = null;

      if (teamId) {
        void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      } else {
        void utils.dashboard.getDashboardCharts.invalidate();
      }

      onCompleteRef.current?.({
        success: !hasError,
        error: polledStatus.lastError ?? null,
      });

      if (hasError) {
        toast.error("Pipeline failed", {
          description: polledStatus.lastError,
          duration: 10000,
        });
      }
    }
  }, [polledStatus, shouldPoll, teamId, utils]);

  // Handle polling timeout
  useEffect(() => {
    if (!pollingMetricId) return;

    const checkTimeout = setInterval(() => {
      if (
        pollingStartTimeRef.current &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT_MS
      ) {
        console.error(`[Pipeline] Timeout for metric ${pollingMetricId}`);
        setPollingMetricId(null);
        pollingStartTimeRef.current = null;

        onCompleteRef.current?.({
          success: false,
          error: "Pipeline timed out. Please try again.",
        });

        toast.error("Pipeline timed out", {
          description: "The operation took too long. Please try again.",
        });
      }
    }, 1000);

    return () => clearInterval(checkTimeout);
  }, [pollingMetricId]);

  // ---------------------------------------------------------------------------
  // Start Polling Helper
  // ---------------------------------------------------------------------------

  const startPolling = useCallback((metricId: string) => {
    if (isTempId(metricId)) return;
    pollingStartTimeRef.current = Date.now();
    setPollingMetricId(metricId);
  }, []);

  // ---------------------------------------------------------------------------
  // Create Mutations
  // ---------------------------------------------------------------------------

  const createMutation = api.metric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return { previousData: undefined, tempId: undefined };

      await utils.dashboard.getDashboardCharts.cancel({ teamId });
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      const tempId = createTempId();
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        metricId: tempId,
        organizationId: "temp",
        chartType: "line",
        chartConfig: null,
        chartTransformer: null,
        chartTransformerId: null,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        size: "medium",
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          id: tempId,
          name: variables.name,
          description: variables.description ?? null,
          refreshStatus: "creating-metric",
          lastError: null,
          lastFetchedAt: null,
          nextPollAt: null,
          pollFrequency: "daily",
          goal: null,
          templateId: variables.templateId,
          teamId: variables.teamId ?? null,
          organizationId: "temp",
          integrationId: null,
          endpointConfig: null,
          integration: null,
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old ? [optimisticChart, ...old] : [optimisticChart],
      );

      return { previousData, tempId };
    },
    onError: (_error, _variables, context) => {
      if (teamId && context?.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousData,
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      if (teamId && context?.tempId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
          if (!old) return [data as DashboardChartWithRelations];

          const tempIndex = old.findIndex((dc) => dc.id === context.tempId);
          if (tempIndex === -1) {
            return [data as DashboardChartWithRelations, ...old];
          }

          const newData = [...old];
          newData[tempIndex] = data as DashboardChartWithRelations;
          return newData;
        });
      }

      startPolling(data.metricId);
    },
  });

  const createManualMutation = api.manualMetric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return { previousData: undefined, tempId: undefined };

      await utils.dashboard.getDashboardCharts.cancel({ teamId });
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      const tempId = createTempId();
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        metricId: tempId,
        organizationId: "temp",
        chartType: "bar",
        chartConfig: null,
        chartTransformer: null,
        chartTransformerId: null,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        size: "medium",
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          id: tempId,
          name: variables.name,
          description: variables.description ?? null,
          refreshStatus: "creating-metric",
          lastError: null,
          lastFetchedAt: null,
          nextPollAt: null,
          pollFrequency: "manual",
          goal: null,
          templateId: null,
          teamId: variables.teamId,
          organizationId: "temp",
          integrationId: null,
          endpointConfig: null,
          integration: null,
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old ? [optimisticChart, ...old] : [optimisticChart],
      );

      return { previousData, tempId };
    },
    onError: (_error, _variables, context) => {
      if (teamId && context?.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousData,
        );
      }
    },
    onSuccess: (data, _variables, context) => {
      if (teamId && context?.tempId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
          if (!old) return [data as DashboardChartWithRelations];

          const tempIndex = old.findIndex((dc) => dc.id === context.tempId);
          if (tempIndex === -1) {
            return [data as DashboardChartWithRelations, ...old];
          }

          const newData = [...old];
          newData[tempIndex] = data as DashboardChartWithRelations;
          return newData;
        });
      }

      startPolling(data.metricId);
    },
  });

  // ---------------------------------------------------------------------------
  // Delete Mutation
  // ---------------------------------------------------------------------------

  const deleteMutation = api.metric.delete.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return { previousData: undefined };

      await utils.dashboard.getDashboardCharts.cancel({ teamId });
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.filter((chart) => chart.metric.id !== variables.id),
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      if (teamId && context?.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousData,
        );
      }
    },
    onSettled: () => {
      if (teamId) {
        void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      } else {
        void utils.dashboard.getDashboardCharts.invalidate();
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Update Mutation
  // ---------------------------------------------------------------------------

  const updateMutation = api.metric.update.useMutation({
    onSuccess: () => {
      if (teamId) {
        void utils.dashboard.getDashboardCharts.invalidate({ teamId });
      } else {
        void utils.dashboard.getDashboardCharts.invalidate();
      }
    },
  });

  // ---------------------------------------------------------------------------
  // Pipeline Mutations (refresh, regenerate, etc.)
  // ---------------------------------------------------------------------------

  const refreshMutation = api.pipeline.refresh.useMutation();
  const regenerateMutation = api.pipeline.regenerate.useMutation();
  const regenerateChartOnlyMutation =
    api.pipeline.regenerateChartOnly.useMutation();

  // ---------------------------------------------------------------------------
  // Pipeline Operation Wrappers (await + poll)
  // ---------------------------------------------------------------------------

  /**
   * Refresh metric data (soft refresh - reuses transformers)
   */
  const refresh = useCallback(
    async (metricId: string) => {
      await refreshMutation.mutateAsync({ metricId });
      startPolling(metricId);
    },
    [refreshMutation, startPolling],
  );

  /**
   * Regenerate entire pipeline (hard refresh - recreates transformers)
   */
  const regenerate = useCallback(
    async (metricId: string) => {
      await regenerateMutation.mutateAsync({ metricId });
      startPolling(metricId);
    },
    [regenerateMutation, startPolling],
  );

  /**
   * Regenerate chart only (keeps data, recreates chart transformer)
   */
  const regenerateChart = useCallback(
    async (
      metricId: string,
      options: {
        chartType?: string;
        cadence?: Cadence;
        selectedDimension?: string;
      },
    ) => {
      await regenerateChartOnlyMutation.mutateAsync({
        metricId,
        chartType: options.chartType,
        cadence: options.cadence,
        selectedDimension: options.selectedDimension,
      });
      startPolling(metricId);
    },
    [regenerateChartOnlyMutation, startPolling],
  );

  // ---------------------------------------------------------------------------
  // Status Helpers
  // ---------------------------------------------------------------------------

  /**
   * Get current status for a specific metric.
   * Uses polled status if this metric is being polled, otherwise derives from cache.
   */
  const getStatus = useCallback(
    (
      metricId: string,
      cachedRefreshStatus?: string | null,
      cachedLastError?: string | null,
    ): PipelineStatus => {
      // If this metric is currently being polled, use polled status
      if (pollingMetricId === metricId && polledStatus) {
        return {
          isProcessing: !!polledStatus.refreshStatus,
          processingStep: polledStatus.refreshStatus ?? null,
          hasError: !!polledStatus.lastError,
          lastError: polledStatus.lastError ?? null,
        };
      }

      // If we're polling this metric but haven't got a response yet, show processing
      if (pollingMetricId === metricId) {
        return {
          isProcessing: true,
          processingStep: cachedRefreshStatus ?? "processing",
          hasError: false,
          lastError: null,
        };
      }

      // Otherwise derive from cached data
      const isTemp = isTempId(metricId);
      if (isTemp) {
        return {
          isProcessing: true,
          processingStep: "creating-metric",
          hasError: false,
          lastError: null,
        };
      }

      return {
        isProcessing: !!cachedRefreshStatus,
        processingStep: cachedRefreshStatus ?? null,
        hasError: !!cachedLastError,
        lastError: cachedLastError ?? null,
      };
    },
    [pollingMetricId, polledStatus],
  );

  /**
   * Check if a specific metric is currently being polled
   */
  const isPolling = useCallback(
    (metricId: string) => pollingMetricId === metricId,
    [pollingMetricId],
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Mutations
    create: createMutation,
    createManual: createManualMutation,
    delete: deleteMutation,
    update: updateMutation,

    // Pipeline operations (await these!)
    refresh,
    regenerate,
    regenerateChart,

    // Status
    getStatus,
    isPolling,
    pollingMetricId,

    // Loading states
    isCreating: createMutation.isPending || createManualMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isRefreshing: refreshMutation.isPending,
    isRegenerating:
      regenerateMutation.isPending || regenerateChartOnlyMutation.isPending,
  };
}

// =============================================================================
// Utility Exports
// =============================================================================

export { isTempId, createTempId };
