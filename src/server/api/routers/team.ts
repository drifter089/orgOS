import { randomUUID } from "crypto";
import { z } from "zod";

import { teamStoredNodeSchema } from "@/app/teams/[teamId]/schemas/canvas";
import {
  storedEdgeSchema,
  viewportSchema,
} from "@/lib/canvas/schemas/stored-data";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";
import {
  cacheStrategyWithTags,
  invalidateCacheByTags,
  teamCanvasCache,
} from "@/server/api/utils/cache-strategy";

// Session expires after 60 seconds of no heartbeat
const SESSION_TIMEOUT_MS = 60000;

export const teamRouter = createTRPCRouter({
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);

    // Clean up expired sessions
    await ctx.db.editSession.deleteMany({
      where: { lastSeen: { lt: cutoff } },
    });

    const teams = await ctx.db.team.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        _count: { select: { roles: true, metrics: true } },
        editSession: true,
      },
      orderBy: { updatedAt: "desc" },
    });

    // Add lock info for each team
    return teams.map((team) => {
      const isLocked =
        team.editSession && team.editSession.userId !== ctx.user.id;
      return {
        ...team,
        isLocked: !!isLocked,
        lockedByUserName: isLocked ? team.editSession?.userName : null,
        editSession: undefined, // Don't expose raw session data
      };
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
        ...cacheStrategyWithTags(teamCanvasCache, [`team_${input.id}`]),
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
        reactFlowNodes: z.array(teamStoredNodeSchema).optional(),
        reactFlowEdges: z.array(storedEdgeSchema).optional(),
        viewport: viewportSchema.optional(),
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
      const updated = await ctx.db.team.update({
        where: { id },
        data,
        include: { roles: { include: { metric: true } } },
      });

      // Invalidate Prisma Accelerate cache for this team
      await invalidateCacheByTags(ctx.db, [`team_${id}`]);

      return updated;
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
