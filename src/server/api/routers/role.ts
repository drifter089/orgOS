import { TRPCError } from "@trpc/server";
import { WorkOS } from "@workos-inc/node";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Initialize WorkOS client
const workos = new WorkOS(process.env.WORKOS_API_KEY);

export const roleRouter = createTRPCRouter({
  /**
   * Create new role
   */
  create: protectedProcedure
    .input(
      z.object({
        teamId: z.string(),
        title: z.string().min(1).max(100),
        purpose: z.string().min(1),
        metricId: z.string(),
        nodeId: z.string(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to team
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Check org membership
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

      // Create role
      return ctx.db.role.create({
        data: input,
        include: { metric: true },
      });
    }),

  /**
   * Update role
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).max(100).optional(),
        purpose: z.string().min(1).optional(),
        metricId: z.string().optional(),
        assignedUserId: z.string().nullable().optional(),
        color: z
          .string()
          .regex(/^#[0-9A-F]{6}$/i)
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch role to verify team access
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: { team: true },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Check org membership
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: role.team.organizationId,
        });

      if (!memberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to modify this role",
        });
      }

      // Update role
      const { id, ...data } = input;
      return ctx.db.role.update({
        where: { id },
        data,
        include: { metric: true },
      });
    }),

  /**
   * Delete role
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Fetch role to verify team access
      const role = await ctx.db.role.findUnique({
        where: { id: input.id },
        include: { team: true },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Check org membership
      const memberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: ctx.user.id,
          organizationId: role.team.organizationId,
        });

      if (!memberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to delete this role",
        });
      }

      // Delete role
      await ctx.db.role.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  /**
   * Assign user to role
   */
  assignUser: protectedProcedure
    .input(
      z.object({
        roleId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify role exists and user has access
      const role = await ctx.db.role.findUnique({
        where: { id: input.roleId },
        include: { team: true },
      });

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      // Verify both current user and assigned user belong to org
      const [currentUserMemberships, assignedUserMemberships] =
        await Promise.all([
          workos.userManagement.listOrganizationMemberships({
            userId: ctx.user.id,
            organizationId: role.team.organizationId,
          }),
          workos.userManagement.listOrganizationMemberships({
            userId: input.userId,
            organizationId: role.team.organizationId,
          }),
        ]);

      if (!currentUserMemberships.data.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have access to this role",
        });
      }

      if (!assignedUserMemberships.data.length) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User is not a member of this organization",
        });
      }

      // Update role assignment
      return ctx.db.role.update({
        where: { id: input.roleId },
        data: { assignedUserId: input.userId },
        include: { metric: true },
      });
    }),

  /**
   * Get all roles for a team
   */
  getByTeam: protectedProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify user has access to team
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found",
        });
      }

      // Check org membership
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

      // Return roles for the team
      return ctx.db.role.findMany({
        where: { teamId: input.teamId },
        include: { metric: true },
        orderBy: { createdAt: "asc" },
      });
    }),
});
