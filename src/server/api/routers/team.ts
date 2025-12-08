import { randomUUID } from "crypto";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";
import {
  cacheStrategy,
  shortLivedCache,
} from "@/server/api/utils/cache-strategy";

export const teamRouter = createTRPCRouter({
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: { _count: { select: { roles: true, metrics: true } } },
      orderBy: { updatedAt: "desc" },
      ...cacheStrategy(shortLivedCache),
    });
  }),

  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: { roles: { include: { metric: true } } },
        ...cacheStrategy(shortLivedCache),
      });
    }),

  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.team.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: ctx.workspace.organizationId,
          createdBy: ctx.user.id,
          reactFlowNodes: [],
          reactFlowEdges: [],
        },
        include: { roles: true },
      });
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        reactFlowNodes: z.any().optional(),
        reactFlowEdges: z.any().optional(),
        viewport: z.any().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      const { id, ...data } = input;
      return ctx.db.team.update({
        where: { id },
        data,
        include: { roles: { include: { metric: true } } },
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.user.id,
        ctx.workspace,
      );

      await ctx.db.team.delete({ where: { id: input.id } });
      return { success: true };
    }),

  generateShareToken: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.team.update({
        where: { id: input.teamId },
        data: {
          shareToken: randomUUID(),
          isPubliclyShared: true,
        },
        select: {
          id: true,
          shareToken: true,
          isPubliclyShared: true,
        },
      });
    }),

  disableSharing: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      return ctx.db.team.update({
        where: { id: input.teamId },
        data: { isPubliclyShared: false },
        select: {
          id: true,
          shareToken: true,
          isPubliclyShared: true,
        },
      });
    }),

  enableSharing: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
        select: { shareToken: true },
      });

      return ctx.db.team.update({
        where: { id: input.teamId },
        data: {
          shareToken: team?.shareToken ?? randomUUID(),
          isPubliclyShared: true,
        },
        select: {
          id: true,
          shareToken: true,
          isPubliclyShared: true,
        },
      });
    }),
});
