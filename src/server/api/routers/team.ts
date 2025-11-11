import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";

export const teamRouter = createTRPCRouter({
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.team.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: { _count: { select: { roles: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: { roles: { include: { metric: true } } },
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
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

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
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

      await ctx.db.team.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
