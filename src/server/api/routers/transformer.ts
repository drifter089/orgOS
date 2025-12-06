/**
 * Transformer tRPC Router
 *
 * Handles transformer operations:
 * - MetricTransformer: Raw API → DataPoints (via unified flow)
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { z } from "zod";

import { getTemplate } from "@/lib/integrations";
import {
  createChartTransformer,
  executeChartTransformerForMetric,
  executeTransformerForPolling,
  getChartTransformerByMetricId,
  getTransformerByTemplateId,
  regenerateChartTransformer,
  transformAndSaveMetricData,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { db } from "@/server/db";

export const transformerRouter = createTRPCRouter({
  // ===========================================================================
  // MetricTransformer Procedures
  // ===========================================================================

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
   * Uses unified flow: single fetch, batch save.
   */
  executeMetricTransformer: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
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

      // Get template for isTimeSeries
      const template = getTemplate(metric.metricTemplate);
      const isTimeSeries = template?.isTimeSeries !== false;

      // Use the unified transform and save flow
      const result = await executeTransformerForPolling({
        templateId: metric.metricTemplate,
        integrationId: metric.integration.integrationId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Update metric lastFetchedAt
      await db.metric.update({
        where: { id: input.metricId },
        data: { lastFetchedAt: new Date(), lastError: null },
      });

      return {
        success: true,
        dataPointCount: result.dataPoints?.length ?? 0,
        dataPoints: result.dataPoints?.slice(0, 10), // Return first 10 for preview
      };
    }),

  /**
   * Force refresh metric data with transformer creation if needed
   */
  refreshMetricData: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ input }) => {
      const metric = await db.metric.findUnique({
        where: { id: input.metricId },
        include: { integration: true },
      });

      if (!metric || !metric.metricTemplate || !metric.integration) {
        return { success: false, error: "Metric not found or not configured" };
      }

      const template = getTemplate(metric.metricTemplate);
      const isTimeSeries = template?.isTimeSeries !== false;

      // Use full unified flow (creates transformer if needed)
      const result = await transformAndSaveMetricData({
        templateId: metric.metricTemplate,
        integrationId: metric.integration.integrationId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });

      if (result.success) {
        await db.metric.update({
          where: { id: input.metricId },
          data: { lastFetchedAt: new Date(), lastError: null },
        });
      }

      return result;
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
