import { useMemo } from "react";

import { api } from "@/trpc/react";

export interface PipelineStatusResult {
  isProcessing: boolean;
  currentStep: string | null;
  error: string | null;
}

/** Derives pipeline status from dashboard query cache. */
export function usePipelineStatus(
  metricId: string | undefined,
  teamId?: string,
): PipelineStatusResult {
  const { data: charts } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    { enabled: false },
  );

  return useMemo(() => {
    if (!metricId || !charts) {
      return {
        isProcessing: false,
        currentStep: null,
        error: null,
      };
    }

    const chart = charts.find((c) => c.metric.id === metricId);

    if (!chart) {
      return {
        isProcessing: false,
        currentStep: null,
        error: null,
      };
    }

    return {
      isProcessing: !!chart.metric.refreshStatus,
      currentStep: chart.metric.refreshStatus ?? null,
      error: chart.metric.lastError ?? null,
    };
  }, [metricId, charts]);
}
