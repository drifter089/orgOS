/**
 * Pipeline Router
 *
 * Handles metric data pipeline operations with fire-and-forget pattern:
 * - refresh: Soft refresh (reuse transformers) - returns immediately
 * - regenerate: Hard refresh (delete & recreate) - returns immediately
 * - getProgress: Poll endpoint for frontend status updates
 *
 * Fire-and-forget pattern:
 * 1. Set metric.refreshStatus = starting step
 * 2. Return immediately to frontend
 * 3. Run pipeline in background (NOT awaited)
 * 4. Frontend polls getProgress to show progress
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { refreshMetricAndCharts } from "@/server/api/services/transformation";
import { createChartTransformer } from "@/server/api/services/transformation/chart-generator";
import { ingestMetricData } from "@/server/api/services/transformation/data-pipeline";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";
import { db } from "@/server/db";

/**
 * Fire-and-forget wrapper for pipeline operations.
 * Runs the pipeline in background, updates metric.refreshStatus on completion/error.
 *
 * Note: Uses the service's internal db singleton since it runs after response is sent.
 */
async function runPipelineInBackground(
  metricId: string,
  forceRegenerate: boolean,
): Promise<void> {
  try {
    const result = await refreshMetricAndCharts({
      metricId,
      forceRegenerate,
    });

    // Note: refreshMetricAndCharts handles status updates internally
    // It clears refreshStatus on success and sets lastError on failure
    if (!result.success) {
      console.error(
        `[Pipeline] Background pipeline failed for ${metricId}:`,
        result.error,
      );
    }
  } catch (error) {
    console.error(
      `[Pipeline] Background pipeline error for ${metricId}:`,
      error,
    );
    // Error handling is done inside refreshMetricAndCharts
  }
}

/**
 * Fire-and-forget: Regenerate ONLY the ingestion transformer.
 * Keeps existing chart transformer, fetches fresh data.
 */
async function runIngestionRegenInBackground(
  metricId: string,
  templateId: string,
  integrationId: string,
  connectionId: string,
  endpointConfig: Record<string, string>,
): Promise<void> {
  try {
    // Delete existing ingestion transformer (keyed by metricId)
    await db.dataIngestionTransformer
      .delete({
        where: { templateId: metricId },
      })
      .catch(() => null); // Ignore if doesn't exist

    // Update status
    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: "generating-ingestion-transformer" },
    });

    // Re-run ingestion (will create new transformer with metricId key)
    const result = await ingestMetricData({
      templateId,
      integrationId,
      connectionId,
      metricId,
      endpointConfig,
    });

    if (!result.success) {
      throw new Error(
        result.error ?? "Failed to regenerate ingestion transformer",
      );
    }

    // Clear status and update lastFetchedAt
    await db.metric.update({
      where: { id: metricId },
      data: {
        refreshStatus: null,
        lastFetchedAt: new Date(),
        lastError: null,
      },
    });

    // Log success
    await db.metricApiLog.create({
      data: {
        metricId,
        endpoint: "transformer:regenerate-ingestion:complete",
        success: true,
        rawResponse: {
          action: "regenerate-ingestion",
          dataPointCount: result.dataPoints?.length ?? 0,
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.info(
      `[Pipeline] Ingestion regeneration complete for ${metricId}: ${result.dataPoints?.length ?? 0} data points`,
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Pipeline] Ingestion regeneration failed for ${metricId}:`,
      errorMsg,
    );

    // Log failure
    await db.metricApiLog.create({
      data: {
        metricId,
        endpoint: "transformer:regenerate-ingestion:error",
        success: false,
        rawResponse: {
          action: "regenerate-ingestion",
          error: errorMsg,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await db.metric.update({
      where: { id: metricId },
      data: {
        refreshStatus: null,
        lastError: errorMsg,
      },
    });
  }
}

/**
 * Fire-and-forget: Regenerate ONLY the chart transformer.
 * Keeps existing data points, creates new chart config.
 */
async function runChartRegenInBackground(
  metricId: string,
  dashboardChartId: string,
  metricName: string,
  metricDescription: string,
  chartType: string,
): Promise<void> {
  try {
    // Delete existing chart transformer
    await db.chartTransformer
      .delete({
        where: { dashboardChartId },
      })
      .catch(() => null); // Ignore if doesn't exist

    // Update status
    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: "generating-chart-transformer" },
    });

    // Generate new chart transformer
    await createChartTransformer({
      dashboardChartId,
      metricName,
      metricDescription,
      chartType,
      cadence: "DAILY", // Default, will be adjusted by AI based on data
    });

    // Clear status
    await db.metric.update({
      where: { id: metricId },
      data: {
        refreshStatus: null,
        lastError: null,
      },
    });

    // Log success
    await db.metricApiLog.create({
      data: {
        metricId,
        endpoint: "transformer:regenerate-chart:complete",
        success: true,
        rawResponse: {
          action: "regenerate-chart",
          timestamp: new Date().toISOString(),
        },
      },
    });

    console.info(`[Pipeline] Chart regeneration complete for ${metricId}`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[Pipeline] Chart regeneration failed for ${metricId}:`,
      errorMsg,
    );

    // Log failure
    await db.metricApiLog.create({
      data: {
        metricId,
        endpoint: "transformer:regenerate-chart:error",
        success: false,
        rawResponse: {
          action: "regenerate-chart",
          error: errorMsg,
          timestamp: new Date().toISOString(),
        },
      },
    });

    await db.metric.update({
      where: { id: metricId },
      data: {
        refreshStatus: null,
        lastError: errorMsg,
      },
    });
  }
}

export const pipelineRouter = createTRPCRouter({
  /**
   * Refresh metric (soft refresh - reuse transformers)
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  refresh: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "fetching-api-data", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runPipelineInBackground(input.metricId, false);

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Regenerate metric (hard refresh - delete old data + regenerate transformers)
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  regenerate: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-data", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runPipelineInBackground(input.metricId, true);

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Get pipeline progress for frontend polling
   */
  getProgress: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access first
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        select: { refreshStatus: true, lastError: true },
      });

      if (!metric?.refreshStatus) {
        return {
          isProcessing: false,
          currentStep: null,
          error: metric?.lastError,
        };
      }

      return {
        isProcessing: true,
        currentStep: metric.refreshStatus,
        error: null,
      };
    }),

  /**
   * Regenerate ONLY the ingestion transformer for a metric.
   * Keeps existing chart transformer, fetches fresh data.
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  regenerateIngestionOnly: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      if (!metric.templateId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Manual metrics don't have ingestion transformers",
        });
      }

      const integration = await ctx.db.integration.findUnique({
        where: { id: metric.integrationId! },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      // Log start
      await ctx.db.metricApiLog.create({
        data: {
          metricId: input.metricId,
          endpoint: "transformer:regenerate-ingestion:start",
          success: true,
          rawResponse: {
            action: "regenerate-ingestion",
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-transformer", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runIngestionRegenInBackground(
        input.metricId,
        metric.templateId,
        integration.providerId,
        integration.connectionId,
        (metric.endpointConfig as Record<string, string>) ?? {},
      );

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Regenerate ONLY the chart transformer for a metric.
   * Keeps existing data points, creates new chart config.
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  regenerateChartOnly: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
      });

      if (!dashboardChart) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard chart not found",
        });
      }

      // Verify data points exist
      const dataPointCount = await ctx.db.metricDataPoint.count({
        where: { metricId: input.metricId },
      });

      if (dataPointCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No data points to chart - run a data refresh first",
        });
      }

      // Log start
      await ctx.db.metricApiLog.create({
        data: {
          metricId: input.metricId,
          endpoint: "transformer:regenerate-chart:start",
          success: true,
          rawResponse: {
            action: "regenerate-chart",
            timestamp: new Date().toISOString(),
          },
        },
      });

      // Set initial status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-transformer", lastError: null },
      });

      // Fire-and-forget: DO NOT await
      void runChartRegenInBackground(
        input.metricId,
        dashboardChart.id,
        metric.name,
        metric.description ?? "",
        dashboardChart.chartType ?? "line",
      );

      // Return immediately - frontend polls getProgress
      return { success: true, started: true };
    }),

  /**
   * Get transformer info for a metric (for displaying in UI)
   */
  getTransformerInfo: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Get ingestion transformer (keyed by metricId in templateId field)
      const ingestionTransformer =
        await ctx.db.dataIngestionTransformer.findUnique({
          where: { templateId: input.metricId },
          select: { id: true, createdAt: true, updatedAt: true },
        });

      // Get chart transformer
      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
        include: {
          chartTransformer: {
            select: {
              id: true,
              createdAt: true,
              updatedAt: true,
              chartType: true,
              cadence: true,
            },
          },
        },
      });

      // Get data point count and date range
      const dataPointStats = await ctx.db.metricDataPoint.aggregate({
        where: { metricId: input.metricId },
        _count: true,
        _min: { timestamp: true },
        _max: { timestamp: true },
      });

      return {
        ingestionTransformer: ingestionTransformer
          ? {
              exists: true,
              createdAt: ingestionTransformer.createdAt,
              updatedAt: ingestionTransformer.updatedAt,
            }
          : { exists: false },
        chartTransformer: dashboardChart?.chartTransformer
          ? {
              exists: true,
              createdAt: dashboardChart.chartTransformer.createdAt,
              updatedAt: dashboardChart.chartTransformer.updatedAt,
              chartType: dashboardChart.chartTransformer.chartType,
              cadence: dashboardChart.chartTransformer.cadence,
            }
          : { exists: false },
        dataPoints: {
          count: dataPointStats._count,
          firstDate: dataPointStats._min.timestamp,
          lastDate: dataPointStats._max.timestamp,
        },
      };
    }),
});
