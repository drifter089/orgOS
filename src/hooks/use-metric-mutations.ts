import type { Prisma } from "@prisma/client";

import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  /**
   * Create metric with optimistic update
   */
  const create = api.metric.create.useMutation({
    onMutate: async (variables) => {
      const tempId = `temp-${Date.now()}`;

      // Cancel in-flight queries to prevent race conditions
      await utils.dashboard.getDashboardCharts.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardCharts.cancel({ teamId });
      }

      // Build optimistic chart with minimal data
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        organizationId: "",
        metricId: tempId,
        chartType: "bar",
        chartConfig: {} as Prisma.JsonValue,
        position: 9999,
        size: "medium",
        chartTransformerId: null,
        chartTransformer: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          id: tempId,
          name: variables.name,
          description: variables.description ?? null,
          organizationId: "",
          integrationId: variables.connectionId,
          templateId: variables.templateId,
          endpointConfig: variables.endpointParams,
          teamId: variables.teamId ?? null,
          lastFetchedAt: null,
          pollFrequency: "daily",
          nextPollAt: null,
          lastError: null,
          refreshStatus: "fetching-api-data",
          createdAt: new Date(),
          updatedAt: new Date(),
          integration: null,
          roles: [],
          goal: null,
        },
        goalProgress: null,
        valueLabel: null,
      };

      // Save previous data for rollback
      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

      // Add optimistic chart to cache
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old ? [...old, optimisticChart] : [optimisticChart],
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old ? [...old, optimisticChart] : [optimisticChart],
        );
      }

      return { tempId, previousData, previousTeamData };
    },

    onSuccess: (realChart, _variables, context) => {
      if (!context) return;

      // Extend the returned chart with required fields for cache
      const enrichedChart: DashboardChartWithRelations = {
        ...realChart,
        metric: { ...realChart.metric, goal: null },
        goalProgress: null,
        valueLabel: null,
      };

      // Swap temp chart with real chart
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((chart) =>
          chart.id === context.tempId ? enrichedChart : chart,
        ),
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.map((chart) =>
            chart.id === context.tempId ? enrichedChart : chart,
          ),
        );
      }
    },

    onError: (_error, _variables, context) => {
      if (!context) return;

      // Rollback to previous data
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

    // Note: onSettled is intentionally omitted for the create mutation.
    // Cache invalidation happens in MetricDialogBase after pipeline completes
    // via useWaitForPipeline hook to prevent metric disappearing during processing.
  });

  /**
   * Create manual metric with optimistic update
   */
  const createManual = api.manualMetric.create.useMutation({
    onMutate: async (variables) => {
      const tempId = `temp-${Date.now()}`;

      // Cancel in-flight queries
      await utils.dashboard.getDashboardCharts.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardCharts.cancel({ teamId });
      }

      // Build optimistic chart for manual metric
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        organizationId: "",
        metricId: tempId,
        chartType: "bar",
        chartConfig: {} as Prisma.JsonValue,
        position: 9999,
        size: "medium",
        chartTransformerId: null,
        chartTransformer: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          id: tempId,
          name: variables.name,
          description: null,
          organizationId: "",
          integrationId: null,
          templateId: "manual",
          endpointConfig: {
            type: "manual",
            unitType: variables.unitType,
            cadence: variables.cadence,
          },
          teamId: variables.teamId ?? null,
          lastFetchedAt: null,
          pollFrequency: "manual",
          nextPollAt: null,
          lastError: null,
          refreshStatus: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          integration: null,
          roles: [],
          goal: null,
        },
        goalProgress: null,
        valueLabel: variables.unitType === "percentage" ? "%" : null,
      };

      // Save previous data for rollback
      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

      // Add optimistic chart to cache
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old ? [...old, optimisticChart] : [optimisticChart],
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old ? [...old, optimisticChart] : [optimisticChart],
        );
      }

      return { tempId, previousData, previousTeamData };
    },

    onSuccess: (realChart, variables, context) => {
      if (!context) return;

      // Extend the returned chart with required fields for cache
      const enrichedChart: DashboardChartWithRelations = {
        ...realChart,
        chartTransformer: null,
        metric: { ...realChart.metric, goal: null },
        goalProgress: null,
        valueLabel: variables.unitType === "percentage" ? "%" : null,
      };

      // Swap temp chart with real chart
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((chart) =>
          chart.id === context.tempId ? enrichedChart : chart,
        ),
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.map((chart) =>
            chart.id === context.tempId ? enrichedChart : chart,
          ),
        );
      }
    },

    onError: (_error, _variables, context) => {
      if (!context) return;

      // Rollback to previous data
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

    onSettled: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  /**
   * Delete metric with optimistic update
   */
  const deleteMutation = api.metric.delete.useMutation({
    onMutate: async (variables) => {
      // Cancel in-flight queries
      await utils.dashboard.getDashboardCharts.cancel();
      if (teamId) {
        await utils.dashboard.getDashboardCharts.cancel({ teamId });
      }

      // Save previous data for rollback
      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : undefined;

      // Remove chart optimistically
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.filter((chart) => chart.metric.id !== variables.id),
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.filter((chart) => chart.metric.id !== variables.id),
        );
      }

      return { previousData, previousTeamData };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;

      // Rollback to previous data
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

    onSettled: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  /**
   * Refresh metric (soft refresh - reuse transformers)
   */
  const refresh = api.pipeline.refresh.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  /**
   * Regenerate metric (hard refresh - delete & recreate)
   */
  const regenerate = api.pipeline.regenerate.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
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
