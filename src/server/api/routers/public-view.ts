import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  cacheStrategy,
  dashboardCache,
  singleItemCache,
} from "@/server/api/utils/cache-strategy";

// Read-only procedures for publicly shared teams/dashboards (no auth required)
export const publicViewRouter = createTRPCRouter({
  getTeamByShareToken: publicProcedure
    .input(z.object({ teamId: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        include: {
          roles: {
            include: { metric: true },
          },
        },
        ...cacheStrategy(singleItemCache),
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      if (!team.isPubliclyShared || team.shareToken !== input.token) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid or expired share link",
        });
      }

      return team;
    }),

  getDashboardByShareToken: publicProcedure
    .input(z.object({ teamId: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        select: {
          id: true,
          name: true,
          isPubliclyShared: true,
          shareToken: true,
          organizationId: true,
        },
        ...cacheStrategy(singleItemCache),
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      if (!team.isPubliclyShared || team.shareToken !== input.token) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid or expired share link",
        });
      }

      const dashboardCharts = await ctx.db.dashboardChart.findMany({
        where: {
          organizationId: team.organizationId,
          metric: { teamId: input.teamId },
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
        ...cacheStrategy(dashboardCache),
      });

      return {
        team: {
          id: team.id,
          name: team.name,
        },
        dashboardCharts,
      };
    }),
});
