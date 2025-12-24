import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Metric mutations with simplified cache management.
 *
 * Philosophy:
 * - Create: Invalidate cache on success, let server data drive UI
 * - Refresh/Regenerate: Set loading state in cache, let polling handle updates
 * - Delete: Optimistic update (instant feedback)
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  /**
   * Helper to invalidate dashboard cache with proper keys
   * Returns a promise that resolves when invalidation completes
   */
  const invalidateDashboard = async () => {
    // Invalidate all variants to ensure UI updates
    // Must await to ensure refetch happens before dialog closes
    await Promise.all([
      utils.dashboard.getDashboardCharts.invalidate(),
      teamId
        ? utils.dashboard.getDashboardCharts.invalidate({ teamId })
        : Promise.resolve(),
    ]);
  };

  /**
   * Helper to update a metric's refreshStatus in cache
   * This provides immediate loading feedback
   */
  const setMetricProcessing = (metricId: string, status: string | null) => {
    const updateFn = (old: DashboardChartWithRelations[] | undefined) =>
      old?.map((dc) =>
        dc.metric.id === metricId
          ? { ...dc, metric: { ...dc.metric, refreshStatus: status } }
          : dc,
      );

    utils.dashboard.getDashboardCharts.setData(undefined, updateFn);
    if (teamId) {
      utils.dashboard.getDashboardCharts.setData({ teamId }, updateFn);
    }
  };

  /**
   * Create metric - simple invalidation approach
   * Server returns the real card with refreshStatus set, dashboard will show it
   */
  const create = api.metric.create.useMutation({
    onSuccess: async () => {
      // Invalidate and wait for refetch to complete
      await invalidateDashboard();
    },
  });

  /**
   * Create manual metric - simple invalidation approach
   */
  const createManual = api.manualMetric.create.useMutation({
    onSuccess: async () => {
      await invalidateDashboard();
    },
  });

  /**
   * Delete metric with optimistic update (instant feedback)
   */
  const deleteMutation = api.metric.delete.useMutation({
    onMutate: async (variables) => {
      await utils.dashboard.getDashboardCharts.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardCharts.cancel({ teamId });
      }

      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

      // Remove optimistically
      const filterFn = (old: DashboardChartWithRelations[] | undefined) =>
        old?.filter((chart) => chart.metric.id !== variables.id);

      utils.dashboard.getDashboardCharts.setData(undefined, filterFn);
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, filterFn);
      }

      return { previousData, previousTeamData };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      if (context.previousData !== undefined) {
        utils.dashboard.getDashboardCharts.setData(
          undefined,
          context.previousData,
        );
      }
      if (teamId && context.previousTeamData !== undefined) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousTeamData,
        );
      }
    },
    onSettled: async () => {
      await invalidateDashboard();
    },
  });

  /**
   * Refresh metric (soft refresh)
   * Sets loading state immediately, polling handles completion
   */
  const refresh = api.pipeline.refresh.useMutation({
    onMutate: (variables) => {
      // Show loading state immediately
      setMetricProcessing(variables.metricId, "fetching-api-data");
    },
    onError: (_, variables) => {
      // Clear loading state on error
      setMetricProcessing(variables.metricId, null);
    },
  });

  /**
   * Regenerate metric (hard refresh)
   * Sets loading state immediately, polling handles completion
   */
  const regenerate = api.pipeline.regenerate.useMutation({
    onMutate: (variables) => {
      // Show loading state immediately
      setMetricProcessing(variables.metricId, "deleting-old-data");
    },
    onError: (_, variables) => {
      // Clear loading state on error
      setMetricProcessing(variables.metricId, null);
    },
  });

  return {
    create,
    createManual,
    delete: deleteMutation,
    refresh,
    regenerate,
  };
}
