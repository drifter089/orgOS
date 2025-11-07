import { TRPCError } from "@trpc/server";
import { WorkOS } from "@workos-inc/node";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Initialize WorkOS client
const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const teamRouter = createTRPCRouter({
  /**
   * Get all teams for user's organization
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Get user's organization memberships
    const memberships = await workos.userManagement.listOrganizationMemberships(
      {
        userId: ctx.user.id,
        limit: 1,
      },
    );

    if (!memberships.data[0]) {
      return [];
    }

    const organizationId = memberships.data[0].organizationId;

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
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
        include: {
          roles: {
            include: { metric: true },
          },
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Authorization: Check if user belongs to same organization
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: team.organizationId,
        });

      if (!memberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this team",
        });
      }

      return team;
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
      // Get user's organization
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          limit: 1,
        });

      if (!memberships.data[0]) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Must belong to an organization to create teams",
        });
      }

      const organizationId = memberships.data[0].organizationId;

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
      // Verify team exists
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Authorization: Check if user belongs to same organization
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: team.organizationId,
        });

      if (!memberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to modify this team",
        });
      }

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
      // Verify team exists
      const team = await ctx.db.team.findUnique({
        where: { id: input.id },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Authorization: Check if user belongs to same organization
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: team.organizationId,
        });

      if (!memberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to delete this team",
        });
      }

      // Delete team (cascade will delete all roles)
      await ctx.db.team.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
