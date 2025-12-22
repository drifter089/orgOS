import { useCallback } from "react";

import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

type DashboardChartWithRelations =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface UseOptimisticMetricUpdateOptions {
  teamId?: string;
}

/**
 * Hook for optimistic updates when creating metrics.
 * Handles cache cancellation, optimistic insertion, swapping temp→real IDs, and rollback.
 */
export function useOptimisticMetricUpdate({
  teamId,
}: UseOptimisticMetricUpdateOptions = {}) {
  const utils = api.useUtils();

  const cancelQueries = useCallback(async () => {
    await utils.dashboard.getDashboardCharts.cancel();
    if (teamId) {
      await utils.dashboard.getDashboardCharts.cancel({ teamId });
      await utils.metric.getByTeamId.cancel({ teamId });
    }
    await utils.metric.getAll.cancel();
  }, [utils, teamId]);

  const addOptimisticChart = useCallback(
    (chart: DashboardChartWithRelations) => {
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old ? [...old, chart] : [chart],
      );
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old ? [...old, chart] : [chart],
        );
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old ? [...old, chart.metric] : [chart.metric],
        );
      }
    },
    [utils, teamId],
  );

  const swapTempWithReal = useCallback(
    (tempId: string, realChart: DashboardChartWithRelations) => {
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((dc) => (dc.id === tempId ? realChart : dc)),
      );
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.map((dc) => (dc.id === tempId ? realChart : dc)),
        );
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.map((m) => (m.id === tempId ? realChart.metric : m)),
        );
      }
    },
    [utils, teamId],
  );

  const rollback = useCallback(
    (tempId: string) => {
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.filter((dc) => dc.id !== tempId),
      );
      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.filter((dc) => dc.id !== tempId),
        );
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.filter((m) => m.id !== tempId),
        );
      }
    },
    [utils, teamId],
  );

  return {
    cancelQueries,
    addOptimisticChart,
    swapTempWithReal,
    rollback,
  };
}
