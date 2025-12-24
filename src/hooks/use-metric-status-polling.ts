import { useEffect, useState } from "react";

import { api } from "@/trpc/react";

/**
 * Hook for card-level pipeline status polling.
 *
 * Architecture:
 * - Only polls when metric has active pipeline (refreshStatus !== null)
 * - Skips polling for optimistic cards (temp- prefix)
 * - Polls at 500ms for responsive progress updates
 * - On pipeline completion, invalidates dashboard query to fetch full chart data
 *
 * @param metricId - The metric ID to poll status for
 * @param initialStatus - Initial status from parent query cache
 */
export function useMetricStatusPolling(
  metricId: string,
  initialStatus: string | null,
) {
  const utils = api.useUtils();
  const [isProcessing, setIsProcessing] = useState(!!initialStatus);

  const { data: status } = api.metric.getStatus.useQuery(
    { metricId },
    {
      // Only poll if:
      // 1. Metric is processing (has refreshStatus)
      // 2. Not an optimistic card (temp- prefix)
      enabled: isProcessing && !metricId.startsWith("temp-"),
      refetchInterval: isProcessing ? 500 : false,
    },
  );

  useEffect(() => {
    if (!status) return;

    const wasProcessing = isProcessing;
    const nowProcessing = !!status.refreshStatus;

    // Pipeline just completed - invalidate dashboard to get fresh chart data
    if (wasProcessing && !nowProcessing) {
      void utils.dashboard.getDashboardCharts.invalidate();
    }

    setIsProcessing(nowProcessing);
  }, [status, isProcessing, utils]);

  // Sync with parent data when it changes (e.g., after invalidation)
  useEffect(() => {
    setIsProcessing(!!initialStatus);
  }, [initialStatus]);

  return {
    refreshStatus: status?.refreshStatus ?? initialStatus,
    lastError: status?.lastError ?? null,
    isProcessing,
  };
}
