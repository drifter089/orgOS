import type { Cadence } from "@prisma/client";

import { createTempMetricId, isTempMetricId } from "@/lib/utils/metric-id";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

interface UseMetricMutationsOptions {
  teamId?: string;
}

/**
 * Simplified metric mutations hook.
 *
 * Design principles:
 * 1. Optimistic updates for structural changes (create/delete)
 * 2. Atomic cache replacement on create success (no flicker)
 * 3. No cache manipulation for processing operations (refresh/regenerate)
 * 4. Callers use startPolling() from useMetricStatus after mutations
 */
export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  const invalidateDashboard = () => {
    void utils.dashboard.getDashboardCharts.invalidate();
  };

  // Helper to replace temp card with real data atomically (no flicker)
  const replaceTempCardWithReal = (realChart: DashboardChartWithRelations) => {
    if (!teamId) return;

    utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
      if (!old) return [realChart];

      // Find and replace the temp card with real data
      const tempIndex = old.findIndex((dc) => isTempMetricId(dc.id));
      if (tempIndex === -1) {
        // No temp card found, prepend the real one
        return [realChart, ...old];
      }

      // Replace temp with real
      const newData = [...old];
      newData[tempIndex] = realChart;
      return newData;
    });
  };

  // ==========================================================================
  // Create Mutations (with optimistic temp card)
  // ==========================================================================

  const create = api.metric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Create optimistic card with temp ID
      const tempId = createTempMetricId();
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
    onSuccess: (data) => {
      // Replace temp card with real data atomically - no flicker!
      // The server returns the full DashboardChart with metric data
      replaceTempCardWithReal(data as DashboardChartWithRelations);
    },
  });

  const createManual = api.manualMetric.create.useMutation({
    onMutate: async (variables) => {
      if (!teamId) return;

      await utils.dashboard.getDashboardCharts.cancel();
      const previousData = utils.dashboard.getDashboardCharts.getData({
        teamId,
      });

      // Create optimistic card for manual metric
      const tempId = createTempMetricId();
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
    onSuccess: (data) => {
      // Replace temp card with real data atomically
      replaceTempCardWithReal(data as DashboardChartWithRelations);
    },
  });

  // ==========================================================================
  // Delete Mutation (with optimistic removal)
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
  // Update Mutation (simple - no optimistic update needed)
  // ==========================================================================

  const update = api.metric.update.useMutation({
    onSuccess: invalidateDashboard,
  });

  // ==========================================================================
  // Pipeline Mutations (simple - caller uses startPolling() for status)
  //
  // These don't manipulate cache. Instead:
  // 1. Mutation fires, server starts processing
  // 2. Caller calls startPolling() from useMetricStatus
  // 3. Polling tracks progress until completion
  // 4. useMetricStatus invalidates cache on completion
  // ==========================================================================

  const refresh = api.pipeline.refresh.useMutation();
  const regenerate = api.pipeline.regenerate.useMutation();
  const regenerateChartOnly = api.pipeline.regenerateChartOnly.useMutation();

  return {
    // Create
    create,
    createManual,
    // Update
    update,
    // Delete
    delete: deleteMutation,
    // Pipeline operations (caller should call startPolling after these)
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
