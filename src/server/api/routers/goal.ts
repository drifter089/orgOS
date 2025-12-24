/**
 * Goal Router
 *
 * Handles metric goal operations:
 * - get: Get goal with progress calculation
 * - upsert: Create/update goal with baseline capture
 * - delete: Delete goal
 */
import { z } from "zod";

import {
  type ChartDataForGoal,
  type GoalInput,
  calculateGoalProgress,
} from "@/lib/goals";
import type {
  ChartConfig,
  ChartTransformResult,
} from "@/lib/metrics/transformer-types";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";
import { invalidateCacheByTags } from "@/server/api/utils/cache-strategy";

export const goalRouter = createTRPCRouter({
  /**
   * Get goal for a metric with progress calculation
   */
  get: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to org
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const goal = await ctx.db.metricGoal.findUnique({
        where: { metricId: input.metricId },
      });

      // Get the chart's cadence, selectedDimension, and chartConfig for goal calculation
      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
        select: {
          chartConfig: true,
          chartTransformer: {
            select: { cadence: true, selectedDimension: true },
          },
          metric: { select: { integrationId: true, endpointConfig: true } },
        },
      });

      // Manual metrics store cadence in endpointConfig (lowercase), convert to uppercase Prisma Cadence
      const isManualMetric = dashboardChart?.metric?.integrationId === null;
      const rawManualCadence = (
        dashboardChart?.metric?.endpointConfig as { cadence?: string } | null
      )?.cadence;
      const manualCadence = rawManualCadence
        ? (rawManualCadence.toUpperCase() as "DAILY" | "WEEKLY" | "MONTHLY")
        : null;
      const cadence = isManualMetric
        ? manualCadence
        : (dashboardChart?.chartTransformer?.cadence ?? null);

      // Parse chartConfig for unified metadata access
      const chartConfig = dashboardChart?.chartConfig as unknown as ChartConfig;
      const chartConfigResult =
        dashboardChart?.chartConfig as unknown as ChartTransformResult;

      // Get valueLabel from chartConfig (ChartTransformer output) as primary source
      // Fall back to DataIngestionTransformer for backward compatibility
      let valueLabel: string | null = null;
      if (chartConfigResult?.valueLabelOverride) {
        valueLabel = chartConfigResult.valueLabelOverride;
      } else if (chartConfigResult?.valueLabel) {
        valueLabel = chartConfigResult.valueLabel;
      } else {
        // Fallback: try DataIngestionTransformer (keyed by metricId for independent metrics)
        const transformer = await ctx.db.dataIngestionTransformer.findUnique({
          where: { templateId: metric.id },
          select: { valueLabel: true },
        });
        valueLabel = transformer?.valueLabel ?? null;
      }

      // Get selectedDimension from chartTransformer
      const selectedDimension =
        dashboardChart?.chartTransformer?.selectedDimension ?? null;

      // Extract current value from chartConfig
      // Use selectedDimension if available and valid, otherwise fall back to dataKeys[0]
      let currentValue: number | null = null;
      let currentValueLabel: string | null = null;
      if (chartConfig?.chartData && chartConfig.chartData.length > 0) {
        const latestData =
          chartConfig.chartData[chartConfig.chartData.length - 1];
        const dataKeys = chartConfig.dataKeys ?? [];
        const primaryKey =
          selectedDimension && dataKeys.includes(selectedDimension)
            ? selectedDimension
            : dataKeys[0];
        if (latestData && primaryKey) {
          const val = latestData[primaryKey];
          if (typeof val === "number") {
            currentValue = val;
            // Use chartConfig label for what's being displayed, fallback to valueLabel
            currentValueLabel =
              chartConfig.chartConfig?.[primaryKey]?.label ??
              valueLabel ??
              primaryKey;
          }
        }
      }

      // If no goal, return current value info for goal creation context
      if (!goal) {
        return {
          goal: null,
          progress: null,
          cadence,
          currentValue,
          currentValueLabel,
          valueLabel,
        };
      }

      // If no chart or no cadence, return goal without progress
      if (!cadence) {
        return {
          goal,
          progress: null,
          cadence: null,
          currentValue,
          currentValueLabel,
          valueLabel,
        };
      }

      // Convert MetricGoal to GoalInput
      const goalInput: GoalInput = {
        goalType: goal.goalType,
        targetValue: goal.targetValue,
        baselineValue: goal.baselineValue,
        baselineTimestamp: goal.baselineTimestamp,
        onTrackThreshold: goal.onTrackThreshold,
      };

      // Convert ChartConfig to ChartDataForGoal
      const chartDataForGoal: ChartDataForGoal = {
        chartData: chartConfig?.chartData ?? [],
        xAxisKey: chartConfig?.xAxisKey ?? "date",
        dataKeys: chartConfig?.dataKeys ?? [],
        selectedDimension,
      };

      const progress = calculateGoalProgress(
        goalInput,
        cadence,
        chartDataForGoal,
      );
      return {
        goal,
        progress,
        cadence,
        currentValue,
        currentValueLabel,
        valueLabel,
      };
    }),

  /**
   * Create or update goal with baseline capture on creation
   */
  upsert: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        goalType: z.enum(["ABSOLUTE", "RELATIVE"]),
        targetValue: z.number().positive(),
        onTrackThreshold: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to org
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Check if goal already exists
      const existingGoal = await ctx.db.metricGoal.findUnique({
        where: { metricId: input.metricId },
      });

      // Capture baseline only on goal creation (not update)
      let baselineValue: number | null = null;
      let baselineTimestamp: Date | null = null;

      if (!existingGoal) {
        // NEW GOAL: Capture baseline from current chart data
        const dashboardChart = await ctx.db.dashboardChart.findFirst({
          where: { metricId: input.metricId },
          select: { chartConfig: true },
        });

        const chartConfig = dashboardChart?.chartConfig as ChartConfig | null;
        if (chartConfig?.chartData?.length) {
          const latestData =
            chartConfig.chartData[chartConfig.chartData.length - 1];
          const primaryKey = chartConfig.dataKeys?.[0];
          if (
            latestData &&
            primaryKey &&
            typeof latestData[primaryKey] === "number"
          ) {
            baselineValue = latestData[primaryKey];
            baselineTimestamp = new Date();
          }
        }
      }

      const goal = await ctx.db.metricGoal.upsert({
        where: { metricId: input.metricId },
        create: {
          metricId: input.metricId,
          goalType: input.goalType,
          targetValue: input.targetValue,
          baselineValue,
          baselineTimestamp,
          onTrackThreshold: input.onTrackThreshold,
        },
        update: {
          goalType: input.goalType,
          targetValue: input.targetValue,
          onTrackThreshold: input.onTrackThreshold,
        },
      });

      // Invalidate dashboard cache
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (metric.teamId) {
        cacheTags.push(`dashboard_team_${metric.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return goal;
    }),

  /**
   * Delete goal
   */
  delete: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to org
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      await ctx.db.metricGoal.delete({
        where: { metricId: input.metricId },
      });

      // Invalidate dashboard cache
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (metric.teamId) {
        cacheTags.push(`dashboard_team_${metric.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return { success: true };
    }),
});
