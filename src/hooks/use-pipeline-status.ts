import { useEffect, useMemo, useRef } from "react";

import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

/**
 * Pipeline processing status - single source of truth for all UI components.
 */
export interface PipelineStatus {
  /** Whether the metric is currently being processed by the pipeline */
  isProcessing: boolean;
  /** Current pipeline step name (e.g., "fetching-api-data") */
  processingStep: string | null;
  /** Whether the metric has an error from the last pipeline run */
  hasError: boolean;
  /** Error message from the last failed pipeline run */
  lastError: string | null;
  /** Whether this is a newly created metric awaiting server response */
  isOptimistic: boolean;
}

/**
 * Unified hook for pipeline status tracking.
 *
 * Single source of truth that:
 * 1. Subscribes to getDashboardCharts cache for reactive updates
 * 2. Polls metric.getStatus when processing is active
 * 3. Invalidates cache on pipeline completion
 * 4. Returns consistent PipelineStatus for all consumers
 *
 * @param metricId - The metric ID to track
 * @param teamId - The team ID for cache subscription
 */
export function usePipelineStatus(
  metricId: string,
  teamId: string,
): {
  /** The full dashboard chart data (null if not found or optimistic) */
  dashboardChart: DashboardChart | null;
  /** Unified pipeline status */
  status: PipelineStatus;
  /** Whether the main query is fetching (background refetch) */
  isFetching: boolean;
} {
  const utils = api.useUtils();
  const prevProcessingRef = useRef<boolean>(false);

  // Primary data source - subscribe to dashboard charts cache
  const { data: dashboardCharts, isFetching } =
    api.dashboard.getDashboardCharts.useQuery(
      { teamId },
      { enabled: Boolean(metricId && teamId) },
    );

  // Find this metric's chart in the cache
  const dashboardChart = useMemo(() => {
    if (!dashboardCharts) return null;
    return dashboardCharts.find((dc) => dc.metric.id === metricId) ?? null;
  }, [dashboardCharts, metricId]);

  // Determine if we're in an optimistic state (temp card or no chart yet)
  const isOptimistic = metricId.startsWith("temp-");

  // Get processing state from cache
  const cacheRefreshStatus = dashboardChart?.metric.refreshStatus ?? null;
  const cacheLastError = dashboardChart?.metric.lastError ?? null;
  const isProcessingFromCache = !!cacheRefreshStatus;

  // Poll for live status updates when processing
  // Skip polling for optimistic cards - they'll get real data on invalidation
  const shouldPoll = isProcessingFromCache && !isOptimistic;

  const { data: polledStatus } = api.metric.getStatus.useQuery(
    { metricId },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 500 : false,
      // Don't refetch on window focus during polling
      refetchOnWindowFocus: false,
    },
  );

  // Determine final processing state
  // Priority: polled status (fresher) > cache status
  const currentRefreshStatus =
    polledStatus?.refreshStatus ?? cacheRefreshStatus;
  const currentLastError = polledStatus?.lastError ?? cacheLastError;
  const isProcessing = !!currentRefreshStatus;

  // Detect pipeline completion and invalidate cache
  useEffect(() => {
    const wasProcessing = prevProcessingRef.current;
    const nowProcessing = isProcessing;

    // Pipeline just completed - invalidate to get fresh chart data
    if (wasProcessing && !nowProcessing && !isOptimistic) {
      void utils.dashboard.getDashboardCharts.invalidate();
    }

    prevProcessingRef.current = nowProcessing;
  }, [isProcessing, isOptimistic, utils]);

  // Build unified status
  const status = useMemo((): PipelineStatus => {
    return {
      isProcessing,
      processingStep: currentRefreshStatus,
      hasError: !!currentLastError,
      lastError: currentLastError,
      isOptimistic,
    };
  }, [isProcessing, currentRefreshStatus, currentLastError, isOptimistic]);

  return {
    dashboardChart,
    status,
    isFetching,
  };
}

/**
 * Lightweight version when you only need status (no chart data).
 */
export function usePipelineStatusOnly(
  metricId: string,
  teamId: string,
): PipelineStatus & { isFetching: boolean } {
  const { status, isFetching } = usePipelineStatus(metricId, teamId);
  return { ...status, isFetching };
}
