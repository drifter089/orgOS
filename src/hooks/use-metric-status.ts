import { useCallback, useEffect, useRef, useState } from "react";

import { isTempMetricId } from "@/lib/utils/metric-id";
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

interface UseMetricStatusOptions {
  /**
   * Initial status from cached data (e.g., from getDashboardCharts).
   * This allows the hook to know if polling should start immediately.
   */
  initialRefreshStatus?: string | null;
  initialLastError?: string | null;
  /**
   * Callback fired when pipeline completes (success or error).
   * Use this to show toast notifications or trigger side effects.
   */
  onComplete?: (result: { success: boolean; error: string | null }) => void;
}

// Polling configuration
const POLLING_INTERVAL_MS = 500;
const POLLING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for tracking metric processing status via polling.
 *
 * Design principles:
 * 1. No query subscriptions - parent passes cached data, we only poll
 * 2. Immediate feedback via startPolling()
 * 3. Timeout safety net to prevent infinite polling
 * 4. Callback on completion for toast notifications
 *
 * @param metricId - The metric ID to track (can be temp-* for optimistic cards)
 * @param options - Configuration options
 */
export function useMetricStatus(
  metricId: string,
  options: UseMetricStatusOptions = {},
): {
  status: MetricStatus;
  /** Call this immediately after starting a mutation to begin polling */
  startPolling: () => void;
  /** Whether polling is currently active */
  isPolling: boolean;
} {
  const { initialRefreshStatus, initialLastError, onComplete } = options;
  const utils = api.useUtils();

  // Track polling state
  const [isPollingActive, setIsPollingActive] = useState(
    () => !!initialRefreshStatus,
  );
  // Immediate processing flag - set true when startPolling() called, before poll response
  const [isPendingProcessing, setIsPendingProcessing] = useState(false);
  const pollingStartTimeRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);

  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Determine if this is an optimistic (temp) card
  const isOptimistic = isTempMetricId(metricId);

  // Poll for live status updates (only when polling is active and not optimistic)
  const shouldPoll = !isOptimistic && isPollingActive;

  const { data: polledStatus } = api.metric.getStatus.useQuery(
    { metricId },
    {
      enabled: shouldPoll,
      refetchInterval: shouldPoll ? POLLING_INTERVAL_MS : false,
      refetchOnWindowFocus: false,
      staleTime: 0,
    },
  );

  // Use polled status when available, otherwise fall back to initial values
  const currentRefreshStatus =
    polledStatus?.refreshStatus ?? initialRefreshStatus ?? null;
  const currentLastError = polledStatus?.lastError ?? initialLastError ?? null;

  // Clear pending flag once we have a real poll response
  useEffect(() => {
    if (polledStatus && isPendingProcessing) {
      setIsPendingProcessing(false);
    }
  }, [polledStatus, isPendingProcessing]);

  // isProcessing is true if:
  // - We have a refreshStatus from poll or cache
  // - OR we just called startPolling() and are waiting for first response
  const isProcessing = !!currentRefreshStatus || isPendingProcessing;

  // Handle polling timeout
  useEffect(() => {
    if (isPollingActive && !pollingStartTimeRef.current) {
      pollingStartTimeRef.current = Date.now();
    }

    if (!isPollingActive) {
      pollingStartTimeRef.current = null;
    }
  }, [isPollingActive]);

  // Check for timeout during polling
  useEffect(() => {
    if (!isPollingActive || !pollingStartTimeRef.current) return;

    const checkTimeout = () => {
      if (
        pollingStartTimeRef.current &&
        Date.now() - pollingStartTimeRef.current > POLLING_TIMEOUT_MS
      ) {
        console.error(
          `[useMetricStatus] Polling timeout for metric ${metricId}`,
        );
        setIsPollingActive(false);
        setIsPendingProcessing(false);
        pollingStartTimeRef.current = null;

        // Notify about timeout
        onCompleteRef.current?.({
          success: false,
          error: "Pipeline timed out. Please try again.",
        });
      }
    };

    const interval = setInterval(checkTimeout, 1000);
    return () => clearInterval(interval);
  }, [isPollingActive, metricId]);

  // Detect completion via polling response
  useEffect(() => {
    if (!shouldPoll || !polledStatus) return;

    // If polled status shows no longer processing, we're done
    if (
      !polledStatus.refreshStatus &&
      isPollingActive &&
      !hasCompletedRef.current
    ) {
      hasCompletedRef.current = true;
      setIsPollingActive(false);
      setIsPendingProcessing(false);
      pollingStartTimeRef.current = null;

      // Invalidate dashboard cache to get fresh chart data
      void utils.dashboard.getDashboardCharts.invalidate();

      // Notify about completion
      const hasError = !!polledStatus.lastError;
      onCompleteRef.current?.({
        success: !hasError,
        error: polledStatus.lastError ?? null,
      });

      // Reset completion flag after a short delay
      setTimeout(() => {
        hasCompletedRef.current = false;
      }, 500);
    }
  }, [polledStatus, shouldPoll, isPollingActive, utils]);

  // Manual trigger to start polling immediately (called by mutations)
  const startPolling = useCallback(() => {
    if (isOptimistic) return;

    hasCompletedRef.current = false;
    pollingStartTimeRef.current = Date.now();
    setIsPendingProcessing(true); // Immediate loading state
    setIsPollingActive(true);
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
    isPolling: isPollingActive,
  };
}

/**
 * Derive MetricStatus from cached data (for read-only views).
 * Use this when you have data from a query and don't need polling.
 */
export function deriveMetricStatus(data: {
  id: string;
  refreshStatus: string | null;
  lastError: string | null;
}): MetricStatus {
  const isOptimistic = isTempMetricId(data.id);

  if (isOptimistic) {
    return {
      isProcessing: true,
      processingStep: "adding-metric",
      hasError: false,
      lastError: null,
      isOptimistic: true,
    };
  }

  return {
    isProcessing: !!data.refreshStatus,
    processingStep: data.refreshStatus,
    hasError: !!data.lastError,
    lastError: data.lastError,
    isOptimistic: false,
  };
}
