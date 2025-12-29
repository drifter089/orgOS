import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  cacheStrategyWithTags,
  dashboardCache,
  invalidateDashboardCache,
} from "@/server/api/utils/cache-strategy";
import { enrichChartsWithGoalProgress } from "@/server/api/utils/enrich-charts-with-goal-progress";
import { enrichChartRolesWithUserNames } from "@/server/api/utils/organization-members";

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
            updatedAt: true,
            selectedDimension: true,
          },
        },
      },
      orderBy: { position: "asc" },
      ...cacheStrategyWithTags(dashboardCache, [
        `dashboard_org_${ctx.workspace.organizationId}`,
      ]),
    });

    // Enrich roles with missing assignedUserName
    const chartsWithUserNames = await enrichChartRolesWithUserNames(
      dashboardCharts,
      ctx.workspace.organizationId,
      ctx.workspace.directory?.id,
    );

    return enrichChartsWithGoalProgress(chartsWithUserNames, ctx.db);
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
              updatedAt: true,
              selectedDimension: true,
            },
          },
        },
        orderBy: { position: "asc" },
        ...cacheStrategyWithTags(dashboardCache, cacheTags),
      });

      // Enrich roles with missing assignedUserName
      const chartsWithUserNames = await enrichChartRolesWithUserNames(
        dashboardCharts,
        ctx.workspace.organizationId,
        ctx.workspace.directory?.id,
      );

      return enrichChartsWithGoalProgress(chartsWithUserNames, ctx.db);
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
      await invalidateDashboardCache(
        ctx.db,
        ctx.workspace.organizationId,
        existing.metric?.teamId,
      );

      return result;
    }),
});
