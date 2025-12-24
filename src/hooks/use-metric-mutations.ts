import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Metric mutations with unified cache management.
 *
 * All mutations invalidate cache on success, letting server data drive UI.
 * Polling handles progress tracking for processing metrics.
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  const invalidateDashboard = async () => {
    await Promise.all([
      utils.dashboard.getDashboardCharts.invalidate(),
      teamId
        ? utils.dashboard.getDashboardCharts.invalidate({ teamId })
        : Promise.resolve(),
    ]);
  };

  const create = api.metric.create.useMutation({
    onSuccess: async () => {
      await invalidateDashboard();
    },
  });

  const createManual = api.manualMetric.create.useMutation({
    onSuccess: async () => {
      await invalidateDashboard();
    },
  });

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

  const refresh = api.pipeline.refresh.useMutation({
    onSuccess: async () => {
      await invalidateDashboard();
    },
  });

  const regenerate = api.pipeline.regenerate.useMutation({
    onSuccess: async () => {
      await invalidateDashboard();
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
