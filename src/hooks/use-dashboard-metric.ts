import { useMemo } from "react";

import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type DashboardChart = RouterOutputs["dashboard"]["getDashboardCharts"][number];

/**
 * Pipeline processing status derived from metric.refreshStatus.
 * Single source of truth for all status-related UI state.
 */
export interface MetricPipelineStatus {
  /** Whether the metric is currently being processed by the pipeline */
  isProcessing: boolean;
  /** Current pipeline step name (e.g., "fetching-api-data") */
  processingStep: string | null;
  /** Whether the metric has an error from the last pipeline run */
  hasError: boolean;
  /** Error message from the last failed pipeline run */
  lastError: string | null;
  /** Whether this is a newly created metric (temp ID) */
  isPending: boolean;
}

/**
 * Hook to get live dashboard metric data from TanStack Query cache.
 *
 * This hook subscribes to the dashboard charts query, which is polled
 * every 2s when any metric is processing. Both card and drawer components
 * should use this hook to get reactive updates.
 *
 * Cache Strategy:
 * - TanStack Query: Polls every 2s during processing, disabled otherwise
 * - Prisma Accelerate: 60s TTL, invalidated after mutations via cache tags
 * - No race conditions: Mutations await cache invalidation before returning
 *
 * @param metricId - The metric ID to find in the cache
 * @param teamId - The team ID for the query (enables team-specific caching)
 */
export function useDashboardMetric(
  metricId: string,
  teamId: string,
): {
  /** The full dashboard chart data (null if not found) */
  dashboardChart: DashboardChart | null;
  /** Pipeline status derived from the metric */
  status: MetricPipelineStatus;
  /** Whether the query is currently fetching (background refetch) */
  isFetching: boolean;
} {
  const { data: dashboardCharts, isFetching } =
    api.dashboard.getDashboardCharts.useQuery({ teamId });

  const dashboardChart = useMemo(() => {
    if (!dashboardCharts) return null;
    return (
      dashboardCharts.find((dc) => dc.metric.id === metricId) ??
      dashboardCharts.find((dc) => dc.metricId === metricId) ??
      null
    );
  }, [dashboardCharts, metricId]);

  const status = useMemo((): MetricPipelineStatus => {
    if (!dashboardChart) {
      return {
        isProcessing: false,
        processingStep: null,
        hasError: false,
        lastError: null,
        isPending: false,
      };
    }

    const { metric } = dashboardChart;
    return {
      isProcessing: !!metric.refreshStatus,
      processingStep: metric.refreshStatus,
      hasError: !!metric.lastError,
      lastError: metric.lastError,
      isPending: dashboardChart.id.startsWith("temp-"),
    };
  }, [dashboardChart]);

  return {
    dashboardChart,
    status,
    isFetching,
  };
}

/**
 * Hook to get pipeline status for a metric by ID.
 * Lighter version of useDashboardMetric when you only need status.
 *
 * @param metricId - The metric ID
 * @param teamId - The team ID for the query
 */
export function useMetricPipelineStatus(
  metricId: string,
  teamId: string,
): MetricPipelineStatus & { isFetching: boolean } {
  const { status, isFetching } = useDashboardMetric(metricId, teamId);
  return { ...status, isFetching };
}
