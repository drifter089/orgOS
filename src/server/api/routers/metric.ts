import type { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/lib/integrations";
import { fetchData } from "@/server/api/services/data-fetching";
import {
  createChartTransformer,
  ingestMetricData,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getIntegrationAndVerifyAccess,
  getMetricAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";
import { invalidateCacheByTags } from "@/server/api/utils/cache-strategy";

/**
 * Run the metric pipeline in the background (fire-and-forget).
 * Updates refreshStatus at each step and stores errors in lastError.
 */
async function runPipelineInBackground(
  db: PrismaClient,
  params: {
    metricId: string;
    dashboardChartId: string;
    templateId: string;
    integrationProviderId: string;
    connectionId: string;
    endpointParams: Record<string, string>;
    isTimeSeries: boolean;
    metricName: string;
    metricDescription: string;
    organizationId: string;
    teamId?: string;
  },
): Promise<void> {
  try {
    // Step 1: Set initial status
    await db.metric.update({
      where: { id: params.metricId },
      data: { refreshStatus: "fetching-api-data" },
    });

    // Step 2: Transform and save data (single fetch, batch save)
    const transformResult = await ingestMetricData({
      templateId: params.templateId,
      integrationId: params.integrationProviderId,
      connectionId: params.connectionId,
      metricId: params.metricId,
      endpointConfig: params.endpointParams,
      isTimeSeries: params.isTimeSeries,
    });

    if (!transformResult.success) {
      await db.metric.update({
        where: { id: params.metricId },
        data: {
          refreshStatus: null,
          lastError: `Data ingestion failed: ${transformResult.error}`,
        },
      });
      return;
    }

    console.info(
      `[metric.create] Saved ${transformResult.dataPoints?.length ?? 0} data points`,
    );

    // Step 3: Update status and create ChartTransformer
    await db.metric.update({
      where: { id: params.metricId },
      data: { refreshStatus: "generating-chart-transformer" },
    });

    try {
      await createChartTransformer({
        dashboardChartId: params.dashboardChartId,
        metricName: params.metricName,
        metricDescription: params.metricDescription,
        chartType: "line",
        cadence: "DAILY",
      });
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Chart generation failed";
      console.error(`[metric.create] ChartTransformer failed:`, errorMsg);
      await db.metric.update({
        where: { id: params.metricId },
        data: {
          refreshStatus: null,
          lastError: `Chart generation failed: ${errorMsg}`,
          lastFetchedAt: new Date(),
        },
      });
      return;
    }

    // Step 4: Complete - clear status and update timestamp
    await db.metric.update({
      where: { id: params.metricId },
      data: {
        refreshStatus: null,
        lastError: null,
        lastFetchedAt: new Date(),
      },
    });

    // Invalidate cache
    const cacheTags = [`dashboard_org_${params.organizationId}`];
    if (params.teamId) {
      cacheTags.push(`dashboard_team_${params.teamId}`);
    }
    await invalidateCacheByTags(db, cacheTags);
  } catch (error) {
    // Handle unexpected errors
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[metric.create] Pipeline error:`, errorMsg);
    await db.metric.update({
      where: { id: params.metricId },
      data: {
        refreshStatus: null,
        lastError: errorMsg,
      },
    });
  }
}

export const metricRouter = createTRPCRouter({
  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        integration: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  getByTeamId: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify team belongs to user's organization
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.metric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          teamId: input.teamId,
        },
        include: {
          integration: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to user's organization
      return getMetricAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.workspace.organizationId,
      );
    }),

  /** Lightweight query for polling refresh status */
  getRefreshStatus: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        select: { refreshStatus: true, organizationId: true },
      });

      if (!metric || metric.organizationId !== ctx.workspace.organizationId) {
        return null;
      }

      return metric.refreshStatus;
    }),

  /**
   * Create a metric with initial data using the unified transformer flow.
   * Single API fetch, transaction-locked transformer creation, batch data saves.
   */
  create: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
        connectionId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        endpointParams: z.record(z.string()),
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to this connection
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      // Get template definition
      const template = getTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template not found: ${input.templateId}`,
        });
      }

      // Get position for dashboard chart
      const count = await ctx.db.dashboardChart.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      // Step 1: Create metric + dashboard chart in transaction
      const dashboardChart = await ctx.db.$transaction(
        async (tx) => {
          const metric = await tx.metric.create({
            data: {
              name: input.name,
              description: input.description,
              organizationId: ctx.workspace.organizationId,
              integrationId: input.connectionId,
              templateId: input.templateId,
              endpointConfig: input.endpointParams,
              teamId: input.teamId,
              pollFrequency: template.defaultPollFrequency ?? "daily",
              nextPollAt: new Date(),
              // Set initial refresh status so frontend knows pipeline is starting
              refreshStatus: "fetching-api-data",
            },
          });

          return tx.dashboardChart.create({
            data: {
              organizationId: ctx.workspace.organizationId,
              metricId: metric.id,
              chartType: "line",
              chartConfig: {},
              size: "medium",
              position: count,
            },
            include: {
              metric: {
                include: {
                  integration: true,
                  roles: true,
                },
              },
              chartTransformer: {
                select: {
                  chartType: true,
                  cadence: true,
                  userPrompt: true,
                  updatedAt: true,
                },
              },
            },
          });
        },
        { timeout: 15000 },
      );

      // Step 2: Fire-and-forget pipeline execution
      // Pipeline runs in background - user sees card immediately with spinner
      void runPipelineInBackground(ctx.db, {
        metricId: dashboardChart.metricId,
        dashboardChartId: dashboardChart.id,
        templateId: input.templateId,
        integrationProviderId: integration.providerId,
        connectionId: input.connectionId,
        endpointParams: input.endpointParams,
        isTimeSeries: template.isTimeSeries !== false,
        metricName: input.name,
        metricDescription: input.description ?? template.description,
        organizationId: ctx.workspace.organizationId,
        teamId: input.teamId,
      });

      // Return immediately - frontend will poll refreshStatus
      return dashboardChart;
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      // Verify metric belongs to user's organization
      const existing = await getMetricAndVerifyAccess(
        ctx.db,
        id,
        ctx.workspace.organizationId,
      );

      const metric = await ctx.db.metric.update({
        where: { id },
        data,
      });

      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (existing.teamId) {
        cacheTags.push(`dashboard_team_${existing.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return metric;
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get metric info before deletion for cache invalidation
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
        select: { teamId: true, organizationId: true },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      const rolesUsingMetric = await ctx.db.role.count({
        where: { metricId: input.id },
      });

      if (rolesUsingMetric > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric. It is used by ${rolesUsingMetric} role(s).`,
        });
      }

      await ctx.db.metric.delete({
        where: { id: input.id },
      });

      // Invalidate Prisma cache for dashboard queries
      const cacheTags = [`dashboard_org_${metric.organizationId}`];
      if (metric.teamId) {
        cacheTags.push(`dashboard_team_${metric.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return { success: true };
    }),

  // ===========================================================================
  // Integration Data Fetching (Single Query for dropdowns AND raw data)
  // ===========================================================================

  /**
   * Unified query for fetching integration data
   * - Used for dropdown options (cached)
   * - Used for raw data pre-fetch (cached)
   * - Supports all HTTP methods (GET, POST, etc.)
   */
  fetchIntegrationData: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        endpoint: z.string(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET"),
        params: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this connection
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      // Fetch data from third-party API via Nango
      return await fetchData(
        input.integrationId,
        input.connectionId,
        input.endpoint,
        {
          method: input.method,
          params: input.params,
          body: input.body,
        },
      );
    }),
});
