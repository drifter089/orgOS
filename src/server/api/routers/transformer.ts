/**
 * Transformer tRPC Router
 *
 * Handles transformer CRUD and execution:
 * - MetricTransformer: Raw API → DataPoints
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { z } from "zod";

import {
  createChartTransformer,
  executeChartTransformerForMetric,
  executeTransformerForMetric,
  getChartTransformerByMetricId,
  getOrCreateMetricTransformer,
  getTransformerByTemplateId,
  regenerateChartTransformer,
  saveDataPoints,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const transformerRouter = createTRPCRouter({
  // ===========================================================================
  // MetricTransformer Procedures
  // ===========================================================================

  /**
   * Get or create a MetricTransformer for a template
   *
   * If transformer exists and is active, returns it.
   * If not, fetches sample data from API and generates new transformer with AI.
   */
  getOrCreateMetricTransformer: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
        integrationId: z.string(),
        connectionId: z.string(),
        endpointConfig: z.record(z.string()),
      }),
    )
    .mutation(async ({ input }) => {
      return getOrCreateMetricTransformer(input);
    }),

  /**
   * Get MetricTransformer by templateId
   */
  getMetricTransformer: workspaceProcedure
    .input(z.object({ templateId: z.string() }))
    .query(async ({ input }) => {
      return getTransformerByTemplateId(input.templateId);
    }),

  /**
   * Execute MetricTransformer for a specific metric
   *
   * Fetches data from API and transforms to DataPoints.
   * Optionally saves to database.
   */
  executeMetricTransformer: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        saveToDb: z.boolean().default(true),
      }),
    )
    .mutation(async ({ input }) => {
      // Get the metric with its integration
      const metric = await db.metric.findUnique({
        where: { id: input.metricId },
        include: { integration: true },
      });

      if (!metric || !metric.metricTemplate || !metric.integration) {
        return { success: false, error: "Metric not found or not configured" };
      }

      // Execute the transformer
      const result = await executeTransformerForMetric({
        templateId: metric.metricTemplate,
        integrationId: metric.integration.integrationId,
        connectionId: metric.integration.connectionId,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
      });

      if (!result.success || !result.dataPoints) {
        return { success: false, error: result.error };
      }

      // Optionally save to database
      if (input.saveToDb && result.dataPoints.length > 0) {
        // TODO: Get isTimeSeries from template
        await saveDataPoints(input.metricId, result.dataPoints, true);

        // Update metric lastFetchedAt
        await db.metric.update({
          where: { id: input.metricId },
          data: { lastFetchedAt: new Date(), lastError: null },
        });
      }

      return {
        success: true,
        dataPointCount: result.dataPoints.length,
        dataPoints: result.dataPoints.slice(0, 10), // Return first 10 for preview
      };
    }),

  /**
   * List all MetricTransformers
   */
  listMetricTransformers: workspaceProcedure.query(async () => {
    return db.metricTransformer.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }),

  // ===========================================================================
  // ChartTransformer Procedures
  // ===========================================================================

  /**
   * Create or update ChartTransformer for a DashboardMetric
   */
  createChartTransformer: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        chartType: z.string().default("line"),
        dateRange: z.string().default("30d"),
        aggregation: z.string().default("none"),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Get the dashboard metric and its underlying metric
      const dashboardMetric = await db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
        include: { metric: true },
      });

      if (!dashboardMetric) {
        throw new Error("DashboardMetric not found");
      }

      return createChartTransformer({
        dashboardMetricId: input.dashboardMetricId,
        metricName: dashboardMetric.metric.name,
        metricDescription: dashboardMetric.metric.description ?? "",
        chartType: input.chartType,
        dateRange: input.dateRange,
        aggregation: input.aggregation,
        userPrompt: input.userPrompt,
      });
    }),

  /**
   * Get ChartTransformer by DashboardMetric ID
   */
  getChartTransformer: workspaceProcedure
    .input(z.object({ dashboardMetricId: z.string() }))
    .query(async ({ input }) => {
      return getChartTransformerByMetricId(input.dashboardMetricId);
    }),

  /**
   * Execute ChartTransformer for a DashboardMetric
   *
   * Transforms stored DataPoints into chart config.
   */
  executeChartTransformer: workspaceProcedure
    .input(z.object({ dashboardMetricId: z.string() }))
    .mutation(async ({ input }) => {
      return executeChartTransformerForMetric(input.dashboardMetricId);
    }),

  /**
   * Regenerate ChartTransformer with new preferences
   */
  regenerateChartTransformer: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        chartType: z.string().optional(),
        dateRange: z.string().optional(),
        aggregation: z.string().optional(),
        userPrompt: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      return regenerateChartTransformer(input);
    }),

  /**
   * List all ChartTransformers
   */
  listChartTransformers: workspaceProcedure.query(async () => {
    return db.chartTransformer.findMany({
      include: {
        dashboardMetric: {
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
    .query(async ({ input }) => {
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
    .query(async ({ input }) => {
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
