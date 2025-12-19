import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/lib/integrations";
import type { ChartConfig } from "@/lib/metrics/transformer-types";
import { fetchData } from "@/server/api/services/data-fetching";
import {
  createChartTransformer,
  ingestMetricData,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getIntegrationAndVerifyAccess,
  getMetricAndVerifyAccess,
} from "@/server/api/utils/authorization";
import { invalidateCacheByTags } from "@/server/api/utils/cache-strategy";
import { calculateGoalProgress } from "@/server/api/utils/goal-calculation";

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
      return ctx.db.metric.findUnique({
        where: { id: input.id },
      });
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
                },
              },
            },
          });
        },
        { timeout: 15000 },
      );

      // Step 2: Transform and save data (single fetch, batch save)
      const transformResult = await ingestMetricData({
        templateId: input.templateId,
        integrationId: integration.providerId,
        connectionId: input.connectionId,
        metricId: dashboardChart.metricId,
        endpointConfig: input.endpointParams,
        isTimeSeries: template.isTimeSeries !== false,
      });

      // Track errors for user visibility
      let chartError: string | null = null;

      if (transformResult.success) {
        console.info(
          `[metric.create] Saved ${transformResult.dataPoints?.length ?? 0} data points`,
        );

        // Step 3: Create ChartTransformer
        try {
          await createChartTransformer({
            dashboardChartId: dashboardChart.id,
            metricName: input.name,
            metricDescription: input.description ?? template.description,
            chartType: "line",
            cadence: "DAILY",
          });
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Chart generation failed";
          console.error(`[metric.create] ChartTransformer failed:`, errorMsg);
          chartError = `Chart generation failed: ${errorMsg}`;
        }
      } else {
        console.error(
          `[metric.create] Transform failed:`,
          transformResult.error,
        );
        chartError = `Data ingestion failed: ${transformResult.error}`;
      }

      // Store any errors for user visibility
      if (chartError) {
        await ctx.db.metric.update({
          where: { id: dashboardChart.metricId },
          data: { lastError: chartError },
        });
      }

      // Update lastFetchedAt
      await ctx.db.metric.update({
        where: { id: dashboardChart.metricId },
        data: { lastFetchedAt: new Date() },
      });

      // Return fresh data
      const result = await ctx.db.dashboardChart.findUnique({
        where: { id: dashboardChart.id },
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
            },
          },
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch created dashboard chart",
        });
      }

      // Invalidate Prisma cache for dashboard queries
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (input.teamId) {
        cacheTags.push(`dashboard_team_${input.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return result;
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
  // Goal Management
  // ===========================================================================

  getGoal: workspaceProcedure
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

      // Get the chart's cadence and chartConfig for goal calculation
      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
        select: {
          chartConfig: true,
          chartTransformer: { select: { cadence: true } },
        },
      });

      // Get valueLabel from DataIngestionTransformer
      let valueLabel: string | null = null;
      if (metric.templateId) {
        let cacheKey = metric.templateId;
        if (metric.templateId.startsWith("gsheets-")) {
          cacheKey = `${metric.templateId}:${metric.id}`;
        }
        const transformer = await ctx.db.dataIngestionTransformer.findUnique({
          where: { templateId: cacheKey },
          select: { valueLabel: true },
        });
        valueLabel = transformer?.valueLabel ?? null;
      }

      // Extract current value from chartConfig
      let currentValue: number | null = null;
      let currentValueLabel: string | null = null;
      const chartConfig = dashboardChart?.chartConfig as unknown as ChartConfig;
      if (chartConfig?.chartData && chartConfig.chartData.length > 0) {
        const latestData =
          chartConfig.chartData[chartConfig.chartData.length - 1];
        const primaryKey = chartConfig.dataKeys?.[0];
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
          cadence: dashboardChart?.chartTransformer?.cadence ?? null,
          currentValue,
          currentValueLabel,
          valueLabel,
        };
      }

      // If no chart or no cadence, return goal without progress
      if (!dashboardChart?.chartTransformer?.cadence) {
        return {
          goal,
          progress: null,
          cadence: null,
          currentValue,
          currentValueLabel,
          valueLabel,
        };
      }

      const progress = calculateGoalProgress(
        goal,
        dashboardChart.chartTransformer.cadence,
        chartConfig,
      );
      return {
        goal,
        progress,
        cadence: dashboardChart.chartTransformer.cadence,
        currentValue,
        currentValueLabel,
        valueLabel,
      };
    }),

  upsertGoal: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        goalType: z.enum(["ABSOLUTE", "RELATIVE"]),
        targetValue: z.number().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to org
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      return ctx.db.metricGoal.upsert({
        where: { metricId: input.metricId },
        create: {
          metricId: input.metricId,
          goalType: input.goalType,
          targetValue: input.targetValue,
        },
        update: {
          goalType: input.goalType,
          targetValue: input.targetValue,
        },
      });
    }),

  deleteGoal: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to org
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      await ctx.db.metricGoal.delete({
        where: { metricId: input.metricId },
      });

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
