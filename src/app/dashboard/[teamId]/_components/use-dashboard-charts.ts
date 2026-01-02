"use client";

import { useCallback } from "react";

import { type RouterOutputs, api } from "@/trpc/react";

type DashboardChartWithRelations =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface UseDashboardChartsReturn {
  charts: DashboardChartWithRelations[];
  isLoading: boolean;
  isError: boolean;
  isProcessing: (metricId: string) => boolean;
  getError: (metricId: string) => string | null;
}

/**
 * Hook for dashboard charts with conditional polling.
 * Polls every 3s while any metric is processing, stops when all complete.
 */
export function useDashboardCharts(teamId: string): UseDashboardChartsReturn {
  const {
    data: charts = [],
    isLoading,
    isError,
  } = api.dashboard.getDashboardCharts.useQuery(
    { teamId },
    {
      refetchInterval: (query) => {
        const data = query.state.data;
        const anyProcessing = data?.some(
          (dc) => dc.metric.refreshStatus !== null,
        );
        return anyProcessing ? 3000 : false;
      },
    },
  );

  const isProcessing = useCallback(
    (metricId: string): boolean => {
      const chart = charts.find((dc) => dc.metric.id === metricId);
      return !!chart?.metric.refreshStatus;
    },
    [charts],
  );

  const getError = useCallback(
    (metricId: string): string | null => {
      const chart = charts.find((dc) => dc.metric.id === metricId);
      if (chart?.metric.refreshStatus) return null;
      return chart?.metric.lastError ?? null;
    },
    [charts],
  );

  return { charts, isLoading, isError, isProcessing, getError };
}
