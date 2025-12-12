/**
 * Data Router (formerly Transformer Router)
 *
 * Handles data pipeline operations:
 * - DataIngestionTransformer: Raw API → DataPoints (via unified flow)
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  createChartTransformer,
  refreshMetricAndCharts,
  regenerateChartTransformer,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getDashboardChartAndVerifyAccess } from "@/server/api/utils/authorization";
import { db } from "@/server/db";

export const transformerRouter = createTRPCRouter({
  /**
   * Refresh metric data and update charts
   *
   * Uses the unified refreshMetricAndCharts function (same as cron job).
   * This fetches data, saves DataPoints, and updates all associated charts.
   */
  refreshMetric: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify organization ownership before calling refresh
      const metric = await db.metric.findUnique({
        where: { id: input.metricId },
        select: { organizationId: true },
      });

      if (!metric) {
        return { success: false, error: "Metric not found" };
      }

      if (metric.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this metric",
        });
      }

      // Use the unified refresh function (same as cron job)
      const result = await refreshMetricAndCharts({
        metricId: input.metricId,
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
        dateRange: z.string().default("all"),
        aggregation: z.string().default("none"),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dashboardChart = await getDashboardChartAndVerifyAccess(
        db,
        input.dashboardChartId,
        ctx.workspace.organizationId,
      );

      // Fetch metric for chart creation
      const metric = await db.metric.findUnique({
        where: { id: dashboardChart.metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      return createChartTransformer({
        dashboardChartId: input.dashboardChartId,
        metricName: metric.name,
        metricDescription: metric.description ?? "",
        chartType: input.chartType,
        dateRange: input.dateRange,
        aggregation: input.aggregation,
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
        dateRange: z.string().optional(),
        aggregation: z.string().optional(),
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
});
