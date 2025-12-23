/**
 * Pipeline Router
 *
 * Handles metric data pipeline operations with fire-and-forget pattern:
 * - refresh: Soft refresh (reuse transformers) - returns immediately
 * - regenerate: Hard refresh (delete & recreate) - returns immediately
 * - regenerateChartOnly: Regenerate chart transformer only (no data fetch)
 * - regenerateIngestionOnly: Regenerate ingestion transformer only
 * - getProgress: Poll endpoint for frontend status updates
 *
 * Fire-and-forget pattern:
 * 1. Set metric.refreshStatus = starting step
 * 2. Return immediately to frontend
 * 3. Run pipeline in background (NOT awaited)
 * 4. Frontend polls getProgress to show progress
 */
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getStepDisplayName } from "@/lib/pipeline";
import { refreshMetricAndCharts } from "@/server/api/services/transformation";
import { createChartTransformer } from "@/server/api/services/transformation/chart-generator";
import { ingestMetricData } from "@/server/api/services/transformation/data-pipeline";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";
import { db } from "@/server/db";

// ============================================================================
// Background Task Runner (Single Implementation)
// ============================================================================

type BackgroundTaskType =
  | "soft-refresh"
  | "hard-refresh"
  | "ingestion-only"
  | "chart-only";

interface BackgroundTaskConfig {
  metricId: string;
  type: BackgroundTaskType;
  // For ingestion-only
  templateId?: string;
  integrationId?: string;
  connectionId?: string;
  endpointConfig?: Record<string, string>;
  // For chart-only
  dashboardChartId?: string;
  metricName?: string;
  metricDescription?: string;
  chartType?: string;
  cadence?: "DAILY" | "WEEKLY" | "MONTHLY";
  selectedDimension?: string;
}

/**
 * Generic background task runner - handles all pipeline types
 */
async function runBackgroundTask(config: BackgroundTaskConfig): Promise<void> {
  const { metricId, type } = config;

  try {
    switch (type) {
      case "soft-refresh":
      case "hard-refresh": {
        const result = await refreshMetricAndCharts({
          metricId,
          forceRegenerate: type === "hard-refresh",
        });
        if (!result.success) {
          console.error(
            `[Pipeline] ${type} failed for ${metricId}:`,
            result.error,
          );
        }
        break;
      }

      case "ingestion-only": {
        // Delete existing ingestion transformer
        await db.dataIngestionTransformer
          .delete({ where: { templateId: metricId } })
          .catch(() => null);

        await db.metric.update({
          where: { id: metricId },
          data: { refreshStatus: "generating-ingestion-transformer" },
        });

        const result = await ingestMetricData({
          templateId: config.templateId!,
          integrationId: config.integrationId!,
          connectionId: config.connectionId!,
          metricId,
          endpointConfig: config.endpointConfig ?? {},
        });

        if (!result.success) {
          throw new Error(result.error ?? "Failed to regenerate ingestion");
        }

        await db.metric.update({
          where: { id: metricId },
          data: {
            refreshStatus: null,
            lastFetchedAt: new Date(),
            lastError: null,
          },
        });

        await logPipelineEvent(
          metricId,
          "regenerate-ingestion:complete",
          true,
          {
            dataPointCount: result.dataPoints?.length ?? 0,
          },
        );
        break;
      }

      case "chart-only": {
        // Delete existing chart transformer
        await db.chartTransformer
          .delete({ where: { dashboardChartId: config.dashboardChartId } })
          .catch(() => null);

        await db.metric.update({
          where: { id: metricId },
          data: { refreshStatus: "generating-chart-transformer" },
        });

        await createChartTransformer({
          dashboardChartId: config.dashboardChartId!,
          metricName: config.metricName!,
          metricDescription: config.metricDescription ?? "",
          chartType: config.chartType ?? "line",
          cadence: config.cadence ?? "DAILY",
          selectedDimension: config.selectedDimension,
        });

        await db.metric.update({
          where: { id: metricId },
          data: { refreshStatus: null, lastError: null },
        });

        await logPipelineEvent(metricId, "regenerate-chart:complete", true);
        break;
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Pipeline] ${type} error for ${metricId}:`, errorMsg);

    await logPipelineEvent(metricId, `${type}:error`, false, {
      error: errorMsg,
    });

    await db.metric.update({
      where: { id: metricId },
      data: { refreshStatus: null, lastError: errorMsg },
    });
  }
}

async function logPipelineEvent(
  metricId: string,
  action: string,
  success: boolean,
  data?: Record<string, unknown>,
): Promise<void> {
  await db.metricApiLog.create({
    data: {
      metricId,
      endpoint: `transformer:${action}`,
      success,
      rawResponse: {
        action,
        ...data,
        timestamp: new Date().toISOString(),
      },
    },
  });
}

// ============================================================================
// Router
// ============================================================================

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

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "fetching-api-data", lastError: null },
      });

      void runBackgroundTask({
        metricId: input.metricId,
        type: "soft-refresh",
      });

      return { success: true, started: true };
    }),

  /**
   * Regenerate metric (hard refresh - delete & recreate)
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

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-data", lastError: null },
      });

      void runBackgroundTask({
        metricId: input.metricId,
        type: "hard-refresh",
      });

      return { success: true, started: true };
    }),

  /**
   * Regenerate ONLY the ingestion transformer
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

      await logPipelineEvent(
        input.metricId,
        "regenerate-ingestion:start",
        true,
      );

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-transformer", lastError: null },
      });

      void runBackgroundTask({
        metricId: input.metricId,
        type: "ingestion-only",
        templateId: metric.templateId,
        integrationId: integration.providerId,
        connectionId: integration.connectionId,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
      });

      return { success: true, started: true };
    }),

  /**
   * Regenerate ONLY the chart transformer
   * FIRE-AND-FORGET: Returns immediately, frontend polls getProgress
   */
  regenerateChartOnly: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        selectedDimension: z.string().optional(),
        chartType: z.string().optional(),
        cadence: z.enum(["DAILY", "WEEKLY", "MONTHLY"]).optional(),
      }),
    )
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

      const dataPointCount = await ctx.db.metricDataPoint.count({
        where: { metricId: input.metricId },
      });

      if (dataPointCount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No data points to chart - run a data refresh first",
        });
      }

      await logPipelineEvent(input.metricId, "regenerate-chart:start", true);

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "deleting-old-transformer", lastError: null },
      });

      void runBackgroundTask({
        metricId: input.metricId,
        type: "chart-only",
        dashboardChartId: dashboardChart.id,
        metricName: metric.name,
        metricDescription: metric.description ?? "",
        chartType: input.chartType ?? dashboardChart.chartType ?? "line",
        selectedDimension: input.selectedDimension,
        cadence: input.cadence,
      });

      return { success: true, started: true };
    }),

  /**
   * Get pipeline progress for frontend polling
   */
  getProgress: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
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
          completedSteps: [] as Array<{
            step: string;
            displayName: string;
            status: "completed" | "failed";
            durationMs?: number;
          }>,
          error: metric?.lastError ?? null,
        };
      }

      // Query recent pipeline step logs (last 5 minutes)
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const stepLogs = await ctx.db.metricApiLog.findMany({
        where: {
          metricId: input.metricId,
          endpoint: { startsWith: "pipeline-step:" },
          fetchedAt: { gte: fiveMinutesAgo },
        },
        orderBy: { fetchedAt: "asc" },
        select: { endpoint: true, fetchedAt: true },
      });

      const completedSteps: Array<{
        step: string;
        displayName: string;
        status: "completed" | "failed";
        durationMs?: number;
      }> = [];

      for (let i = 0; i < stepLogs.length; i++) {
        const log = stepLogs[i]!;
        if (!log.endpoint) continue;
        const stepName = log.endpoint.replace("pipeline-step:", "");

        if (stepName === metric.refreshStatus) continue;

        const nextLog = stepLogs[i + 1];
        const durationMs = nextLog
          ? nextLog.fetchedAt.getTime() - log.fetchedAt.getTime()
          : undefined;

        completedSteps.push({
          step: stepName,
          displayName: getStepDisplayName(stepName),
          status: "completed",
          durationMs,
        });
      }

      return {
        isProcessing: true,
        currentStep: metric.refreshStatus,
        completedSteps,
        error: null,
      };
    }),

  /**
   * Get available dimensions for a metric's data points
   */
  getAvailableDimensions: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const samples = await ctx.db.metricDataPoint.findMany({
        where: {
          metricId: input.metricId,
          dimensions: { not: Prisma.DbNull },
        },
        select: { dimensions: true },
        take: 100,
      });

      const dimensionKeys = new Set<string>();
      for (const sample of samples) {
        if (sample.dimensions && typeof sample.dimensions === "object") {
          Object.keys(sample.dimensions as object).forEach((k) =>
            dimensionKeys.add(k),
          );
        }
      }

      return Array.from(dimensionKeys);
    }),

  /**
   * Get transformer info for a metric
   */
  getTransformerInfo: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const ingestionTransformer =
        await ctx.db.dataIngestionTransformer.findUnique({
          where: { templateId: input.metricId },
          select: { id: true, createdAt: true, updatedAt: true },
        });

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
