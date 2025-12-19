import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { ChartConfig } from "@/lib/metrics/transformer-types";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  cacheStrategyWithTags,
  dashboardCache,
  invalidateCacheByTags,
} from "@/server/api/utils/cache-strategy";
import { calculateGoalProgress } from "@/server/api/utils/goal-calculation";

export const dashboardRouter = createTRPCRouter({
  /**
   * Get all dashboard charts with data (non-empty chartConfig) across all teams
   * Used by the default dashboard page to show all charts
   */
  getAllDashboardChartsWithData: workspaceProcedure.query(async ({ ctx }) => {
    const dashboardCharts = await ctx.db.dashboardChart.findMany({
      where: {
        organizationId: ctx.workspace.organizationId,
        NOT: { chartConfig: { equals: {} } },
      },
      include: {
        metric: {
          include: {
            integration: true,
            roles: true,
            team: true,
            goal: true,
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
      orderBy: { position: "asc" },
      ...cacheStrategyWithTags(dashboardCache, [
        `dashboard_org_${ctx.workspace.organizationId}`,
      ]),
    });

    // Calculate goal progress for each metric that has a goal
    // Uses the chart's aggregated data (chartConfig) for calculation
    const chartsWithGoalProgress = dashboardCharts.map((chart) => {
      if (!chart.metric.goal || !chart.chartTransformer?.cadence) {
        return { ...chart, goalProgress: null };
      }

      // Parse chartConfig as ChartConfig type
      const chartConfig = chart.chartConfig as unknown as ChartConfig;

      const progress = calculateGoalProgress(
        chart.metric.goal,
        chart.chartTransformer.cadence,
        chartConfig,
      );
      return { ...chart, goalProgress: progress };
    });

    return chartsWithGoalProgress;
  }),

  getDashboardCharts: workspaceProcedure
    .input(z.object({ teamId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      // Build cache tags: always include org tag, add team tag if filtered by team
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (input?.teamId) {
        cacheTags.push(`dashboard_team_${input.teamId}`);
      }

      const dashboardCharts = await ctx.db.dashboardChart.findMany({
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
              goal: true,
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
        orderBy: { position: "asc" },
        ...cacheStrategyWithTags(dashboardCache, cacheTags),
      });

      // Calculate goal progress for each metric that has a goal
      // Uses the chart's aggregated data (chartConfig) for calculation
      const chartsWithGoalProgress = dashboardCharts.map((chart) => {
        if (!chart.metric.goal || !chart.chartTransformer?.cadence) {
          return { ...chart, goalProgress: null };
        }

        // Parse chartConfig as ChartConfig type
        const chartConfig = chart.chartConfig as unknown as ChartConfig;

        const progress = calculateGoalProgress(
          chart.metric.goal,
          chart.chartTransformer.cadence,
          chartConfig,
        );
        return { ...chart, goalProgress: progress };
      });

      return chartsWithGoalProgress;
    }),

  /**
   * Update only the chart data for a dashboard chart
   * Used after AI transformation completes (called from client)
   */
  updateDashboardChart: workspaceProcedure
    .input(
      z.object({
        dashboardChartId: z.string(),
        chartType: z.string(),
        chartConfig: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership and get metric's teamId for cache invalidation
      const existing = await ctx.db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
        select: {
          organizationId: true,
          metric: { select: { teamId: true } },
        },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard chart not found",
        });
      }

      if (existing.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this dashboard chart",
        });
      }

      const result = await ctx.db.dashboardChart.update({
        where: { id: input.dashboardChartId },
        data: {
          chartType: input.chartType,
          chartConfig: input.chartConfig as Prisma.InputJsonValue,
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

      // Invalidate Prisma cache for dashboard queries
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (existing.metric?.teamId) {
        cacheTags.push(`dashboard_team_${existing.metric.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return result;
    }),
});
