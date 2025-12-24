import type { Cadence } from "@prisma/client";

import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Unified metric mutations with optimistic updates.
 *
 * All mutations that modify metric/pipeline state are here.
 * Optimistic updates provide immediate UI feedback.
 * Card-level polling (via usePipelineStatus) handles progress tracking.
 *
 * Cache invalidation strategy:
 * - Create/Delete: Invalidate on success (structural change)
 * - Refresh/Regenerate: Optimistic status update only (polling handles completion)
 * - Update/RegenerateChart: Optimistic status update (polling handles completion)
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  const invalidateDashboard = () => {
    void utils.dashboard.getDashboardCharts.invalidate();
  };

  // Helper to update a metric's status in cache
  const updateMetricStatus = (
    metricId: string,
    refreshStatus: string | null,
    clearError = true,
  ) => {
    if (!teamId) return;

    utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
      old?.map((dc) =>
        dc.metric.id === metricId
          ? {
              ...dc,
              metric: {
                ...dc.metric,
                refreshStatus,
                lastError: clearError ? null : dc.metric.lastError,
              },
            }
          : dc,
      ),
    );
  };

  // ==========================================================================
  // Create Mutations
  // ==========================================================================

  const create = api.metric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Create optimistic card with temp ID
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
    onMutate: async (variables) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Create optimistic card for manual metric
      const tempId = `temp-${Date.now()}`;
      const optimisticChart: DashboardChartWithRelations = {
        id: tempId,
        metricId: tempId,
        organizationId: "temp",
        chartType: "bar",
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
          pollFrequency: "manual",
          goal: null,
          templateId: null,
          teamId: variables.teamId,
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
      if (teamId && context?.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousData,
        );
      }
    },
    onSuccess: invalidateDashboard,
  });

  // ==========================================================================
  // Delete Mutation
  // ==========================================================================

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

  // ==========================================================================
  // Update Mutation
  // ==========================================================================

  const update = api.metric.update.useMutation({
    onSuccess: invalidateDashboard,
  });

  // ==========================================================================
  // Pipeline Mutations (Optimistic status → polling handles completion)
  // ==========================================================================

  const refresh = api.pipeline.refresh.useMutation({
    onMutate: async ({ metricId }) => {
      await utils.dashboard.getDashboardCharts.cancel();
      updateMetricStatus(metricId, "fetching-api-data");
    },
  });

  const regenerate = api.pipeline.regenerate.useMutation({
    onMutate: async ({ metricId }) => {
      await utils.dashboard.getDashboardCharts.cancel();
      updateMetricStatus(metricId, "deleting-old-data");
    },
  });

  const regenerateChartOnly = api.pipeline.regenerateChartOnly.useMutation({
    onMutate: async ({ metricId }) => {
      await utils.dashboard.getDashboardCharts.cancel();
      updateMetricStatus(metricId, "generating-chart-transformer");
    },
  });

  return {
    // Create
    create,
    createManual,
    // Update
    update,
    // Delete
    delete: deleteMutation,
    // Pipeline operations
    refresh,
    regenerate,
    regenerateChartOnly,
  };
}

/**
 * Convenience type for mutation props passed to child components.
 */
export interface MetricMutationHandlers {
  onRefresh: (forceRebuild?: boolean) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateMetric: (name: string, description: string) => void;
  onRegenerateChart: (
    chartType: string,
    cadence: Cadence,
    selectedDimension?: string,
  ) => void;
}
