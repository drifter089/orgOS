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
  executeChartTransformerForDashboardChart,
  getChartTransformerByDashboardChartId,
  getDataIngestionTransformerByTemplateId,
  refreshMetricAndCharts,
  regenerateChartTransformer,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const transformerRouter = createTRPCRouter({
  // ===========================================================================
  // DataIngestionTransformer Procedures
  // ===========================================================================

  /**
   * Get DataIngestionTransformer by templateId
   * Note: DataIngestionTransformers are shared across all orgs (one per template)
   */
  getDataIngestionTransformer: workspaceProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      return getDataIngestionTransformerByTemplateId(input.templateId);
    }),

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
   * List all DataIngestionTransformers
   * Note: DataIngestionTransformers are shared across all orgs (one per template)
   * This is an admin/debug endpoint
   */
  listDataIngestionTransformers: workspaceProcedure.query(async () => {
    return db.dataIngestionTransformer.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }),

  // ===========================================================================
  // ChartTransformer Procedures
  // ===========================================================================

  /**
   * Create or update ChartTransformer for a DashboardChart
   */
  createChartTransformer: workspaceProcedure
    .input(
      z.object({
        dashboardChartId: z.string(),
        chartType: z.string().default("line"),
        dateRange: z.string().default("30d"),
        aggregation: z.string().default("none"),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dashboardChart = await db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
        include: { metric: true },
      });

      if (!dashboardChart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DashboardChart not found",
        });
      }

      // Verify organization ownership
      if (dashboardChart.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this dashboard chart",
        });
      }

      return createChartTransformer({
        dashboardChartId: input.dashboardChartId,
        metricName: dashboardChart.metric.name,
        metricDescription: dashboardChart.metric.description ?? "",
        chartType: input.chartType,
        dateRange: input.dateRange,
        aggregation: input.aggregation,
        userPrompt: input.userPrompt,
      });
    }),

  /**
   * Get ChartTransformer by DashboardChart ID
   */
  getChartTransformer: workspaceProcedure
    .input(z.object({ dashboardChartId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify organization ownership via dashboardChart
      const dashboardChart = await db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
      });

      if (!dashboardChart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DashboardChart not found",
        });
      }

      if (dashboardChart.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this dashboard chart",
        });
      }

      return getChartTransformerByDashboardChartId(input.dashboardChartId);
    }),

  /**
   * Execute ChartTransformer for a DashboardChart
   */
  executeChartTransformer: workspaceProcedure
    .input(z.object({ dashboardChartId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify organization ownership
      const dashboardChart = await db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
      });

      if (!dashboardChart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DashboardChart not found",
        });
      }

      if (dashboardChart.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this dashboard chart",
        });
      }

      return executeChartTransformerForDashboardChart(input.dashboardChartId);
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
      // Verify organization ownership
      const dashboardChart = await db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
      });

      if (!dashboardChart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DashboardChart not found",
        });
      }

      if (dashboardChart.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this dashboard chart",
        });
      }

      return regenerateChartTransformer(input);
    }),

  /**
   * List all ChartTransformers for this organization
   */
  listChartTransformers: workspaceProcedure.query(async ({ ctx }) => {
    return db.chartTransformer.findMany({
      where: {
        dashboardChart: {
          organizationId: ctx.workspace.organizationId,
        },
      },
      include: {
        dashboardChart: {
          include: { metric: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  // ===========================================================================
  // DataPoint Procedures
  // ===========================================================================

  /**
   * Get DataPoints for a metric
   */
  getDataPoints: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        limit: z.number().default(100),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify organization ownership
      const metric = await db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      if (metric.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this metric",
        });
      }

      const dataPoints = await db.metricDataPoint.findMany({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await db.metricDataPoint.count({
        where: { metricId: input.metricId },
      });

      return {
        dataPoints,
        total,
        hasMore: input.offset + input.limit < total,
      };
    }),

  /**
   * Get DataPoints summary for a metric
   */
  getDataPointsSummary: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify organization ownership
      const metric = await db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      if (metric.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this metric",
        });
      }

      const [total, oldest, newest] = await Promise.all([
        db.metricDataPoint.count({ where: { metricId: input.metricId } }),
        db.metricDataPoint.findFirst({
          where: { metricId: input.metricId },
          orderBy: { timestamp: "asc" },
        }),
        db.metricDataPoint.findFirst({
          where: { metricId: input.metricId },
          orderBy: { timestamp: "desc" },
        }),
      ]);

      return {
        total,
        oldestTimestamp: oldest?.timestamp ?? null,
        newestTimestamp: newest?.timestamp ?? null,
        latestValue: newest?.value ?? null,
      };
    }),
});
