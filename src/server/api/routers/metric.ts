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
} from "@/server/api/utils/authorization";
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
            dateRange: "30d",
            aggregation: "none",
          });
        } catch (chartError) {
          console.error(`[metric.create] ChartTransformer failed:`, chartError);
        }
      } else {
        console.error(
          `[metric.create] Transform failed:`,
          transformResult.error,
        );
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
        },
      });

      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch created dashboard chart",
        });
      }

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
      return ctx.db.metric.update({
        where: { id },
        data,
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
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

      return { success: true };
    }),

  // ===========================================================================
  // Goal Management
  // ===========================================================================

  getGoal: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to org
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const goal = await ctx.db.metricGoal.findUnique({
        where: { metricId: input.metricId },
      });

      if (!goal) return null;

      const progress = await calculateGoalProgress(
        ctx.db,
        input.metricId,
        goal,
      );
      return { goal, progress };
    }),

  upsertGoal: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        goalType: z.enum(["ABSOLUTE", "RELATIVE"]),
        goalPeriod: z.enum(["WEEKLY", "MONTHLY"]),
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
          goalPeriod: input.goalPeriod,
          targetValue: input.targetValue,
        },
        update: {
          goalType: input.goalType,
          goalPeriod: input.goalPeriod,
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
