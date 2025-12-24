import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Metric mutations with unified cache invalidation.
 *
 * Cache Strategy:
 * - All mutations invalidate the dashboard query on success
 * - Delete uses optimistic update for immediate UI feedback
 * - Polling handles status updates during processing (no optimistic status needed)
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  const invalidateDashboard = () => {
    void utils.dashboard.getDashboardCharts.invalidate();
  };

  const create = api.metric.create.useMutation({
    onSuccess: invalidateDashboard,
  });

  const createManual = api.manualMetric.create.useMutation({
    onSuccess: invalidateDashboard,
  });

  const deleteMutation = api.metric.delete.useMutation({
    onMutate: async (variables) => {
      await utils.dashboard.getDashboardCharts.cancel();

      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

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
    onSettled: invalidateDashboard,
  });

  const refresh = api.pipeline.refresh.useMutation({
    onSuccess: invalidateDashboard,
  });

  const regenerate = api.pipeline.regenerate.useMutation({
    onSuccess: invalidateDashboard,
  });

  return {
    create,
    createManual,
    delete: deleteMutation,
    refresh,
    regenerate,
  };
}
