/**
 * Dev Tool Router
 *
 * Development-only queries for debugging the metric data pipeline.
 * No caching, no mutations - read-only inspection tools.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { getTemplate } from "@/lib/integrations";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

export const devToolRouter = createTRPCRouter({
  /**
   * Get complete pipeline data for a metric.
   * Returns all steps of the data pipeline for debugging.
   */
  getMetricPipelineData: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Only allow in development mode
      if (env.NODE_ENV !== "development") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dev tools only available in development mode",
        });
      }

      // Fetch metric with all related data
      const metric = await ctx.db.metric.findUnique({
        where: {
          id: input.metricId,
          organizationId: ctx.workspace.organizationId,
        },
        include: {
          integration: true,
          team: { select: { id: true, name: true } },
          dataPoints: {
            orderBy: { timestamp: "desc" },
            take: 100, // Last 100 data points
          },
          dashboardCharts: {
            include: {
              chartTransformer: true,
            },
            take: 1, // Primary dashboard chart
          },
          apiLogs: {
            orderBy: { fetchedAt: "desc" },
            take: 5, // Last 5 API calls
          },
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // Get template info if available
      const template = metric.templateId
        ? getTemplate(metric.templateId)
        : null;

      // Get DataIngestionTransformer
      const cacheKey = metric.templateId?.startsWith("gsheets-")
        ? `${metric.templateId}:${metric.id}`
        : metric.templateId;

      const dataIngestionTransformer = cacheKey
        ? await ctx.db.dataIngestionTransformer.findUnique({
            where: { templateId: cacheKey },
          })
        : null;

      // Get primary chart and its transformer
      const dashboardChart = metric.dashboardCharts[0] ?? null;
      const chartTransformer = dashboardChart?.chartTransformer ?? null;

      return {
        // Step 1: Metric info passed to AI
        metricInfo: {
          id: metric.id,
          name: metric.name,
          description: metric.description,
          templateId: metric.templateId,
          template: template
            ? {
                label: template.label,
                description: template.description,
                metricEndpoint: template.metricEndpoint,
                method: template.method ?? "GET",
                requiredParams: template.requiredParams.map((p) => p.name),
                isTimeSeries: template.isTimeSeries,
              }
            : null,
          endpointConfig: metric.endpointConfig,
          integration: metric.integration
            ? {
                providerId: metric.integration.providerId,
                connectionId: metric.integration.connectionId,
                status: metric.integration.status,
              }
            : null,
          lastFetchedAt: metric.lastFetchedAt,
          lastError: metric.lastError,
        },

        // Step 2: Raw API response (from MetricApiLog)
        apiLogs: metric.apiLogs.map((log) => ({
          id: log.id,
          fetchedAt: log.fetchedAt,
          rawResponse: log.rawResponse,
          success: log.success,
          error: log.error,
          endpoint: log.endpoint,
        })),

        // Step 3: DataIngestionTransformer code
        dataIngestionTransformer: dataIngestionTransformer
          ? {
              id: dataIngestionTransformer.id,
              templateId: dataIngestionTransformer.templateId,
              transformerCode: dataIngestionTransformer.transformerCode,
              createdAt: dataIngestionTransformer.createdAt,
              updatedAt: dataIngestionTransformer.updatedAt,
            }
          : null,

        // Step 4: MetricDataPoint records
        dataPoints: metric.dataPoints.map((dp) => ({
          id: dp.id,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dp.dimensions,
          createdAt: dp.createdAt,
        })),

        // Step 5: Data passed to ChartTransformer (same as dataPoints, displayed separately)

        // Step 6: ChartTransformer code
        chartTransformer: chartTransformer
          ? {
              id: chartTransformer.id,
              transformerCode: chartTransformer.transformerCode,
              chartType: chartTransformer.chartType,
              cadence: chartTransformer.cadence,
              userPrompt: chartTransformer.userPrompt,
              version: chartTransformer.version,
              createdAt: chartTransformer.createdAt,
              updatedAt: chartTransformer.updatedAt,
            }
          : null,

        // Step 7: Final ChartConfig
        chartConfig: dashboardChart?.chartConfig ?? null,
        dashboardChartId: dashboardChart?.id ?? null,
      };
    }),
});
