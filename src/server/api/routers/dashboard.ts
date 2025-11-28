import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { transformMetricWithAI } from "@/server/api/services/chart-tools/ai-transformer";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  /**
   * Get all dashboard metrics with charts (non-empty graphConfig) across all teams
   * Used by the default dashboard page to show all metrics
   */
  getAllDashboardMetricsWithCharts: workspaceProcedure.query(
    async ({ ctx }) => {
      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          NOT: { graphConfig: { equals: {} } },
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
              team: true,
            },
          },
        },
        orderBy: { position: "asc" },
      });
      return dashboardMetrics;
    },
  ),

  getDashboardMetrics: workspaceProcedure
    .input(z.object({ teamId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          ...(input?.teamId && {
            metric: { teamId: input.teamId },
          }),
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
        orderBy: { position: "asc" },
      });

      return dashboardMetrics;
    }),

  /**
   * Update only the chart data for a dashboard metric
   * Used after AI transformation completes (called from client)
   */
  updateDashboardMetricChart: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        graphType: z.string(),
        graphConfig: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
        select: { organizationId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard metric not found",
        });
      }

      if (existing.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this dashboard metric",
        });
      }

      return ctx.db.dashboardMetric.update({
        where: { id: input.dashboardMetricId },
        data: {
          graphType: input.graphType,
          graphConfig: input.graphConfig as Prisma.InputJsonValue,
          metric: {
            update: {
              lastFetchedAt: new Date(),
            },
          },
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
    }),

  /**
   * Transform raw API data into chart format using AI
   * Called from frontend with pre-fetched data for faster UX
   */
  transformChartWithAI: workspaceProcedure
    .input(
      z.object({
        metricConfig: z.object({
          name: z.string(),
          description: z.string().optional(),
          metricTemplate: z.string(),
          endpointConfig: z.record(z.string()),
        }),
        rawData: z.unknown(),
        userHint: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Create a metric-like object for the AI transformer
      const metricLike = {
        id: "",
        name: input.metricConfig.name,
        description: input.metricConfig.description ?? null,
        organizationId: "",
        teamId: null,
        integrationId: null,
        metricTemplate: input.metricConfig.metricTemplate,
        endpointConfig: input.metricConfig.endpointConfig,
        lastFetchedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await transformMetricWithAI(
        metricLike,
        input.rawData,
        input.userHint,
      );

      if (!result.success || !result.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "AI transformation failed",
        });
      }

      return result.data;
    }),
});
