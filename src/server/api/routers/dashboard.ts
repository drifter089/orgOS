import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  cacheStrategy,
  shortLivedCache,
} from "@/server/api/utils/cache-strategy";

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
          },
        },
      },
      orderBy: { position: "asc" },
      ...cacheStrategy(shortLivedCache),
    });
    return dashboardCharts;
  }),

  getDashboardCharts: workspaceProcedure
    .input(z.object({ teamId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
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
            },
          },
        },
        orderBy: { position: "asc" },
        ...cacheStrategy(shortLivedCache),
      });

      return dashboardCharts;
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
      // Verify ownership
      const existing = await ctx.db.dashboardChart.findUnique({
        where: { id: input.dashboardChartId },
        select: { organizationId: true },
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

      return ctx.db.dashboardChart.update({
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
    }),
});
