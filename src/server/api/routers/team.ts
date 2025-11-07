import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  getTeamAndVerifyAccess,
  getUserOrganizationId,
} from "@/server/api/utils/authorization";

export const teamRouter = createTRPCRouter({
  /**
   * Get all teams for user's organization
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Get user's organization ID
    const organizationId = await getUserOrganizationId(ctx.user.id);

    // Fetch all teams for this organization
    return ctx.db.team.findMany({
      where: { organizationId },
      include: {
        _count: { select: { roles: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  /**
   * Get single team with all roles and metrics
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access to team
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

      // Fetch team with full role and metric details
      return ctx.db.team.findUnique({
        where: { id: input.id },
        include: {
          roles: {
            include: { metric: true },
          },
        },
      });
    }),

  /**
   * Create new team
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get user's organization ID
      const organizationId = await getUserOrganizationId(ctx.user.id);

      // Create team
      return ctx.db.team.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId,
          createdBy: ctx.user.id,
          reactFlowNodes: [],
          reactFlowEdges: [],
        },
        include: { roles: true },
      });
    }),

  /**
   * Update team (name, description, or canvas state)
   */
  update: protectedProcedure
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
      // Verify access to team
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

      // Update team
      const { id, ...data } = input;
      return ctx.db.team.update({
        where: { id },
        data,
        include: { roles: { include: { metric: true } } },
      });
    }),

  /**
   * Delete team
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify access to team
      await getTeamAndVerifyAccess(ctx.db, input.id, ctx.user.id);

      // Delete team (cascade will delete all roles)
      await ctx.db.team.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
