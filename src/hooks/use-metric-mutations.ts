import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Metric mutations with optimistic updates and cache invalidation.
 *
 * Cache Strategy:
 * - Create: Optimistic card with "adding-metric" status → invalidate on success
 * - Refresh/Regenerate: Optimistic status update for immediate feedback
 * - Delete: Optimistic removal with rollback on error
 * - Card-level polling handles progress updates during processing
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  const invalidateDashboard = () => {
    void utils.dashboard.getDashboardCharts.invalidate();
  };

  const create = api.metric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Create optimistic card with temp ID and "adding-metric" status
      const tempId = `temp-${Date.now()}`;
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        metricId: tempId,
        organizationId: "temp",
        chartType: "line",
        chartConfig: null,
        chartTransformer: null,
        chartTransformerId: null,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        size: "medium",
        position: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          id: tempId,
          name: variables.name,
          description: variables.description ?? null,
          refreshStatus: "adding-metric",
          lastError: null,
          lastFetchedAt: null,
          nextPollAt: null,
          pollFrequency: "daily",
          goal: null,
          templateId: variables.templateId,
          teamId: variables.teamId ?? null,
          organizationId: "temp",
          integrationId: null,
          endpointConfig: null,
          integration: null,
          roles: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old ? [optimisticChart, ...old] : [optimisticChart],
      );

      return { previousData };
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (teamId && context?.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousData,
        );
      }
    },
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
    onMutate: async ({ metricId }) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();

      // Optimistic update: set status to "fetching-api-data"
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === metricId
            ? {
                ...dc,
                metric: {
                  ...dc.metric,
                  refreshStatus: "fetching-api-data",
                  lastError: null,
                },
              }
            : dc,
        ),
      );
    },
    // No onSuccess invalidate - card polling handles completion
  });

  const regenerate = api.pipeline.regenerate.useMutation({
    onMutate: async ({ metricId }) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();

      // Optimistic update: set status to indicate regeneration starting
      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
        old?.map((dc) =>
          dc.metric.id === metricId
            ? {
                ...dc,
                metric: {
                  ...dc.metric,
                  refreshStatus: "fetching-api-data",
                  lastError: null,
                },
              }
            : dc,
        ),
      );
    },
    // No onSuccess invalidate - card polling handles completion
  });

  return {
    create,
    createManual,
    delete: deleteMutation,
    refresh,
    regenerate,
  };
}
