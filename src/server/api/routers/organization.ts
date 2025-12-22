import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  workspaceProcedure,
} from "@/server/api/trpc";
import {
  createOrganizationForUser,
  getWorkspaceContext,
} from "@/server/api/utils/authorization";
import { fetchOrganizationMembers } from "@/server/api/utils/organization-members";
import { workos } from "@/server/workos";

export const organizationRouter = createTRPCRouter({
  /**
   * Get current organization info and user.
   * Returns null if user has no organization.
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    if (!workspace) {
      return null;
    }

    const currentUser = await workos.userManagement.getUser(ctx.user.id);

    return {
      organization: workspace.organization,
      organizationId: workspace.organizationId,
      directory: workspace.directory ?? null,
      hasDirectorySync: !!workspace.directory,
      currentUser,
    };
  }),

  /**
   * Create a new organization for the current user.
   */
  create: protectedProcedure
    .input(z.object({ name: z.string().min(1).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const existing = await getWorkspaceContext(ctx.user.id);
      if (existing) {
        return existing;
      }
      return createOrganizationForUser(ctx.user.id, input.name);
    }),

  /**
   * Get all members - combines directory users + org members.
   * Single source: WorkOS. Deduplicates by email.
   */
  getMembers: workspaceProcedure.query(async ({ ctx }) => {
    return fetchOrganizationMembers(
      ctx.workspace.organizationId,
      ctx.workspace.directory?.id,
    );
  }),

  /**
   * Get aggregated stats for all members (role count, effort points, goals).
   * Returns a map of userId -> stats for efficient lookup.
   */
  getMemberStats: workspaceProcedure.query(async ({ ctx }) => {
    const roles = await ctx.db.role.findMany({
      where: {
        team: { organizationId: ctx.workspace.organizationId },
        assignedUserId: { not: null },
      },
      select: {
        assignedUserId: true,
        effortPoints: true,
        metric: {
          select: {
            id: true,
            goal: true,
            dataPoints: {
              orderBy: { timestamp: "desc" },
              take: 1,
              select: { value: true },
            },
          },
        },
      },
    });

    const statsMap: Record<
      string,
      {
        roleCount: number;
        totalEffort: number;
        goalsOnTrack: number;
        goalsTotal: number;
      }
    > = {};

    for (const role of roles) {
      const userId = role.assignedUserId!;
      if (!statsMap[userId]) {
        statsMap[userId] = {
          roleCount: 0,
          totalEffort: 0,
          goalsOnTrack: 0,
          goalsTotal: 0,
        };
      }

      statsMap[userId].roleCount += 1;
      statsMap[userId].totalEffort += role.effortPoints ?? 0;

      if (role.metric?.goal) {
        statsMap[userId].goalsTotal += 1;
        const latestValue = role.metric.dataPoints[0]?.value;
        if (
          latestValue !== undefined &&
          latestValue >= role.metric.goal.targetValue
        ) {
          statsMap[userId].goalsOnTrack += 1;
        }
      }
    }

    return statsMap;
  }),
});
