import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getRoleAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";

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

  getByTeam: workspaceProcedure
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
        include: { metric: true },
        orderBy: { createdAt: "asc" },
      });
    }),

  create: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
        title: z.string().min(1).max(100),
        purpose: z.string().min(1),
        metricId: z.string().optional(),
        nodeId: z.string(),
        assignedUserId: z.string().nullable().optional(),
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

      if (
        input.assignedUserId &&
        !ctx.workspace.assignableUserIds.includes(input.assignedUserId)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User cannot be assigned to this role",
        });
      }

      return ctx.db.role.create({
        data: {
          title: input.title,
          purpose: input.purpose,
          teamId: input.teamId,
          metricId: input.metricId ?? null,
          nodeId: input.nodeId,
          color: input.color ?? "#3b82f6",
          assignedUserId: input.assignedUserId ?? null,
        },
        include: { metric: true },
      });
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100).optional(),
        purpose: z.string().optional(),
        assignedUserId: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      if (
        input.assignedUserId &&
        !ctx.workspace.assignableUserIds.includes(input.assignedUserId)
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User cannot be assigned to this role",
        });
      }

      const data: {
        title?: string;
        purpose?: string;
        assignedUserId?: string | null;
      } = {
        title: input.title,
        purpose: input.purpose,
      };

      if (Object.prototype.hasOwnProperty.call(input, "assignedUserId")) {
        data.assignedUserId = input.assignedUserId;
      }

      return ctx.db.role.update({
        where: { id: input.id },
        data,
        include: { metric: true, team: true },
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );
      await ctx.db.role.delete({ where: { id: input.id } });
      return { success: true };
    }),

  assign: workspaceProcedure
    .input(z.object({ id: z.string(), userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      if (!ctx.workspace.assignableUserIds.includes(input.userId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User cannot be assigned to this role",
        });
      }

      return ctx.db.role.update({
        where: { id: input.id },
        data: { assignedUserId: input.userId },
        include: { metric: true, team: true },
      });
    }),

  unassign: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getRoleAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.role.update({
        where: { id: input.id },
        data: { assignedUserId: null },
        include: { metric: true, team: true },
      });
    }),

  getByUser: workspaceProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const teams = await ctx.db.team.findMany({
        where: { organizationId: ctx.workspace.organizationId },
        include: {
          roles: {
            where: { assignedUserId: input.userId },
            include: { metric: true, team: true },
          },
        },
      });

      return teams.flatMap((team) => team.roles);
    }),
});
