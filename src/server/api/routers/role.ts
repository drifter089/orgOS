import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import {
  getRoleAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";
import { workos } from "@/server/workos";

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
      // Verify access to team
      await getTeamAndVerifyAccess(ctx.db, input.teamId, ctx.user.id);

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
      // Verify access to role
      await getRoleAndVerifyAccess(ctx.db, input.id, ctx.user.id);

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
      // Verify access to role
      await getRoleAndVerifyAccess(ctx.db, input.id, ctx.user.id);

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
      // Verify role exists and current user has access
      const role = await getRoleAndVerifyAccess(
        ctx.db,
        input.roleId,
        ctx.user.id,
      );

      // Verify assigned user also belongs to the same org
      const assignedUserMemberships =
        await workos.userManagement.listOrganizationMemberships({
          userId: input.userId,
          organizationId: role.team.organizationId,
        });

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
      // Verify access to team
      await getTeamAndVerifyAccess(ctx.db, input.teamId, ctx.user.id);

      // Return roles for the team
      return ctx.db.role.findMany({
        where: { teamId: input.teamId },
        include: { metric: true },
        orderBy: { createdAt: "asc" },
      });
    }),
});
