/**
 * Data Router (formerly Transformer Router)
 *
 * Handles data pipeline operations:
 * - DataIngestionTransformer: Raw API → DataPoints (via unified flow)
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { z } from "zod";

import {
  createChartTransformer,
  refreshMetricAndCharts,
  regenerateChartTransformer,
  updateManualMetricChart,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getDashboardChartAndVerifyAccess,
  getMetricAndVerifyAccess,
} from "@/server/api/utils/authorization";
import { db } from "@/server/db";

export const transformerRouter = createTRPCRouter({
  /**
   * Refresh metric data and update charts
   *
   * Uses the unified refreshMetricAndCharts function (same as cron job).
   * This fetches data, saves DataPoints, and updates all associated charts.
   *
   * When forceRegenerate is true, deletes existing transformer and recreates
   * from scratch using AI.
   */
  refreshMetric: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        /** When true, deletes transformer and regenerates from scratch */
        forceRegenerate: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const result = await refreshMetricAndCharts({
        metricId: input.metricId,
        forceRegenerate: input.forceRegenerate,
      });

      return {
        success: result.success,
        dataPointCount: result.dataPointCount ?? 0,
        error: result.error,
      };
    }),

  /**
   * Create or update ChartTransformer for a DashboardChart
   */
  createChartTransformer: workspaceProcedure
    .input(
      z.object({
        dashboardChartId: z.string(),
        chartType: z.string().default("line"),
        cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).default("DAILY"),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dashboardChart = await getDashboardChartAndVerifyAccess(
        db,
        input.dashboardChartId,
        ctx.workspace.organizationId,
      );

      const metric = await getMetricAndVerifyAccess(
        db,
        dashboardChart.metricId,
        ctx.workspace.organizationId,
      );

      return createChartTransformer({
        dashboardChartId: input.dashboardChartId,
        metricName: metric.name,
        metricDescription: metric.description ?? "",
        chartType: input.chartType,
        cadence: input.cadence,
        userPrompt: input.userPrompt,
      });
    }),

  /**
   * Regenerate ChartTransformer with new preferences
   */
  regenerateChartTransformer: workspaceProcedure
    .input(
      z.object({
        dashboardChartId: z.string(),
        chartType: z.string().optional(),
        cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getDashboardChartAndVerifyAccess(
        db,
        input.dashboardChartId,
        ctx.workspace.organizationId,
      );

      return regenerateChartTransformer(input);
    }),

  /**
   * Update chart for manual metric check-ins.
   * Reuses existing transformer (no AI) or creates one if needed (AI, once).
   */
  updateManualChart: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      return updateManualMetricChart({ metricId: input.metricId });
    }),
});
