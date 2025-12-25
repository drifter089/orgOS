import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "@/server/api/trpc";
import {
  authCheckCache,
  cacheStrategyWithTags,
  dashboardCache,
} from "@/server/api/utils/cache-strategy";
import { enrichChartsWithGoalProgress } from "@/server/api/utils/enrich-charts-with-goal-progress";
import {
  enrichRolesWithUserNames,
  getOrganizationDirectoryId,
} from "@/server/api/utils/organization-members";

// Read-only procedures for publicly shared teams/dashboards (no auth required)
export const publicViewRouter = createTRPCRouter({
  getTeamByShareToken: publicProcedure
    .input(z.object({ teamId: z.string(), token: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        include: {
          roles: {
            include: {
              metric: {
                include: {
                  // Include dashboardCharts for metric value display on role nodes
                  dashboardCharts: {
                    take: 1,
                    orderBy: { position: "asc" },
                  },
                },
              },
            },
          },
        },
        ...cacheStrategyWithTags(authCheckCache, [`team_${input.teamId}`]),
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

      // Enrich roles with missing assignedUserName
      const directoryId = await getOrganizationDirectoryId(team.organizationId);
      const enrichedRoles = await enrichRolesWithUserNames(
        team.roles,
        team.organizationId,
        directoryId,
      );

      return { ...team, roles: enrichedRoles };
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
        ...cacheStrategyWithTags(authCheckCache, [`team_${input.teamId}`]),
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
              goal: true, // Include goal data for goalProgress display
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
        ...cacheStrategyWithTags(dashboardCache, [`team_${input.teamId}`]),
      });

      // Enrich charts with goal progress and value labels
      const enrichedCharts = await enrichChartsWithGoalProgress(
        dashboardCharts,
        ctx.db,
      );

      return {
        team: {
          id: team.id,
          name: team.name,
        },
        dashboardCharts: enrichedCharts,
      };
    }),
});
