import { useCallback, useEffect, useRef, useState } from "react";

import { api } from "@/trpc/react";

/**
 * Metric processing status - unified interface for all UI components.
 */
export interface MetricStatus {
  /** Whether the metric is currently being processed */
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
 * Simple, reliable hook for tracking metric processing status.
 *
 * Design principles:
 * 1. Poll-first: When processing, poll directly - don't rely on cache
 * 2. Immediate feedback: startPolling() triggers polling right away
 * 3. Robust completion: Uses onSuccess callback, not useEffect comparison
 * 4. Cache sync: Invalidates dashboard cache on completion
 *
 * @param metricId - The metric ID to track (can be temp-* for optimistic cards)
 * @param teamId - The team ID for cache invalidation
 */
export function useMetricStatus(
  metricId: string,
  teamId: string,
): {
  status: MetricStatus;
  /** Call this when starting a mutation to immediately begin polling */
  startPolling: () => void;
  /** Whether the status query is currently fetching */
  isFetching: boolean;
} {
  const utils = api.useUtils();

  // Local state to force polling even before cache updates
  const [isPollingActive, setIsPollingActive] = useState(false);

  // Track if we've invalidated to prevent double-invalidation
  const hasInvalidatedRef = useRef(false);

  // Determine if this is an optimistic (temp) card
  const isOptimistic = metricId.startsWith("temp-");

  // Get initial status from cache (if available)
  const { data: dashboardCharts } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    { enabled: Boolean(teamId) },
  );

  const cachedChart = dashboardCharts?.find((dc) => dc.metric.id === metricId);
  const cachedRefreshStatus = cachedChart?.metric.refreshStatus ?? null;
  const cachedLastError = cachedChart?.metric.lastError ?? null;

  // Determine if we should poll:
  // 1. Manual trigger via startPolling()
  // 2. Cache shows processing status
  // 3. NOT for optimistic cards (they don't exist on server yet)
  const shouldPoll =
    !isOptimistic && (isPollingActive || !!cachedRefreshStatus);

  // Poll for live status updates with onSuccess handling
  const { data: polledStatus, isFetching } = api.metric.getStatus.useQuery(
    { metricId },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? 500 : false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  // Use polled status when available (fresher), fall back to cache
  const currentRefreshStatus =
    polledStatus?.refreshStatus ?? cachedRefreshStatus;
  const currentLastError = polledStatus?.lastError ?? cachedLastError;
  const isProcessing = !!currentRefreshStatus;

  // Detect completion via polling response (more reliable than useEffect comparison)
  useEffect(() => {
    // Only check when we're actively polling and get a response
    if (!shouldPoll || !polledStatus) return;

    // If polled status shows no longer processing, we're done
    if (!polledStatus.refreshStatus && isPollingActive) {
      // Stop polling
      setIsPollingActive(false);

      // Invalidate cache to get fresh chart data (only once)
      if (!hasInvalidatedRef.current) {
        hasInvalidatedRef.current = true;
        void utils.dashboard.getDashboardCharts.invalidate();

        // Reset flag after a delay to allow future invalidations
        setTimeout(() => {
          hasInvalidatedRef.current = false;
        }, 1000);
      }
    }
  }, [polledStatus, shouldPoll, isPollingActive, utils]);

  // Also detect completion from cache (for when polling wasn't active)
  useEffect(() => {
    // If cache shows processing stopped but we weren't polling, still need to update
    if (cachedRefreshStatus === null && isPollingActive) {
      setIsPollingActive(false);
    }
  }, [cachedRefreshStatus, isPollingActive]);

  // Manual trigger to start polling immediately (called by mutations)
  const startPolling = useCallback(() => {
    if (!isOptimistic) {
      setIsPollingActive(true);
      hasInvalidatedRef.current = false;
    }
  }, [isOptimistic]);

  // Build status object
  const status: MetricStatus = isOptimistic
    ? {
        isProcessing: true,
        processingStep: "adding-metric",
        hasError: false,
        lastError: null,
        isOptimistic: true,
      }
    : {
        isProcessing,
        processingStep: currentRefreshStatus,
        hasError: !!currentLastError,
        lastError: currentLastError,
        isOptimistic: false,
      };

  return {
    status,
    startPolling,
    isFetching,
  };
}
