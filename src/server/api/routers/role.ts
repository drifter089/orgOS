import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getRoleAndVerifyAccess,
  getTeamAndVerifyAccess,
  validateUserAssignable,
} from "@/server/api/utils/authorization";
import {
  cacheStrategyWithTags,
  invalidateCacheByTags,
  listCache,
} from "@/server/api/utils/cache-strategy";
import { getUserDisplayName } from "@/server/api/utils/get-user-display-name";

const metricInclude = {
  include: {
    dashboardCharts: {
      take: 1,
    },
  },
};

export const roleRouter = createTRPCRouter({
  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );
    }),

  getByTeamId: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.role.findMany({
        where: { teamId: input.teamId },
        include: {
          metric: metricInclude,
        },
        orderBy: { createdAt: "asc" },
        ...cacheStrategyWithTags(listCache, [`team_${input.teamId}`]),
      });
    }),

  create: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
        title: z.string().min(1).max(100),
        purpose: z.string().min(1),
        accountabilities: z.string().optional(),
        metricId: z.string().optional(),
        nodeId: z.string(),
        assignedUserId: z.string().nullable().optional(),
        effortPoints: z.number().int().optional(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      if (input.assignedUserId) {
        await validateUserAssignable(ctx.workspace, input.assignedUserId);
      }

      if (input.metricId) {
        const existingRolesCount = await ctx.db.role.count({
          where: { metricId: input.metricId },
        });

        if (existingRolesCount >= 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A metric can have at most 3 roles assigned",
          });
        }
      }

      const assignedUserName = await getUserDisplayName(input.assignedUserId);

      const role = await ctx.db.role.create({
        data: {
          title: input.title,
          purpose: input.purpose,
          accountabilities: input.accountabilities ?? null,
          teamId: input.teamId,
          metricId: input.metricId ?? null,
          nodeId: input.nodeId,
          color: input.color ?? "#3b82f6",
          assignedUserId: input.assignedUserId ?? null,
          assignedUserName,
          effortPoints: input.effortPoints ?? null,
        },
        include: { metric: metricInclude },
      });

      // Invalidate Prisma Accelerate cache for this team and dashboard
      await invalidateCacheByTags(ctx.db, [
        `team_${input.teamId}`,
        `dashboard_team_${input.teamId}`,
      ]);

      return role;
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100).optional(),
        purpose: z.string().optional(),
        accountabilities: z.string().optional(),
        metricId: z.string().optional(),
        assignedUserId: z.string().optional().nullable(),
        effortPoints: z.number().int().optional().nullable(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      if (input.assignedUserId) {
        await validateUserAssignable(ctx.workspace, input.assignedUserId);
      }

      const data: {
        title?: string;
        purpose?: string;
        accountabilities?: string | null;
        metricId?: string | null;
        assignedUserId?: string | null;
        assignedUserName?: string | null;
        effortPoints?: number | null;
        color?: string;
      } = {
        title: input.title,
        purpose: input.purpose,
        accountabilities: input.accountabilities,
        color: input.color,
      };

      if (Object.prototype.hasOwnProperty.call(input, "assignedUserId")) {
        data.assignedUserId = input.assignedUserId;
        data.assignedUserName = await getUserDisplayName(input.assignedUserId);
      }

      if (Object.prototype.hasOwnProperty.call(input, "metricId")) {
        data.metricId = input.metricId ?? null;
      }

      if (Object.prototype.hasOwnProperty.call(input, "effortPoints")) {
        data.effortPoints = input.effortPoints ?? null;
      }

      // Validate max 3 roles per metric
      if (input.metricId) {
        const existingRolesCount = await ctx.db.role.count({
          where: {
            metricId: input.metricId,
            id: { not: input.id },
          },
        });

        if (existingRolesCount >= 3) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A metric can have at most 3 roles assigned",
          });
        }
      }

      const role = await ctx.db.role.update({
        where: { id: input.id },
        data,
        include: { metric: metricInclude, team: true },
      });

      // Invalidate Prisma Accelerate cache for this team and dashboard
      await invalidateCacheByTags(ctx.db, [
        `team_${role.teamId}`,
        `dashboard_team_${role.teamId}`,
      ]);

      return role;
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get role first to capture teamId for cache invalidation
      const role = await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );
      await ctx.db.role.delete({ where: { id: input.id } });

      // Invalidate Prisma Accelerate cache for this team and dashboard
      await invalidateCacheByTags(ctx.db, [
        `team_${role.teamId}`,
        `dashboard_team_${role.teamId}`,
      ]);

      return { success: true };
    }),

  getByUser: workspaceProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teams = await ctx.db.team.findMany({
        where: { organizationId: ctx.workspace.organizationId },
        include: {
          roles: {
            where: { assignedUserId: input.userId },
            include: { metric: metricInclude, team: true },
          },
        },
      });

      return teams.flatMap((team) => team.roles);
    }),
});
