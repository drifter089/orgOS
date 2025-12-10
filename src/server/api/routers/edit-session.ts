import { type PrismaClient } from "@prisma/client";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getTeamAndVerifyAccess } from "@/server/api/utils/authorization";

// Session expires after 60 seconds of no heartbeat
const SESSION_TIMEOUT_MS = 60000;

/** Clean up expired sessions and return active session if any */
async function getActiveSession(db: PrismaClient, teamId: string) {
  const cutoff = new Date(Date.now() - SESSION_TIMEOUT_MS);
  await db.editSession.deleteMany({
    where: { teamId, lastSeen: { lt: cutoff } },
  });
  return db.editSession.findUnique({ where: { teamId } });
}

/**
 * Edit Session Router - Multi-user edit blocking for team canvases.
 * First user gets edit rights; others see read-only view.
 */
export const editSessionRouter = createTRPCRouter({
  /** Check if team is locked by another user */
  check: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );
      const session = await getActiveSession(ctx.db, input.teamId);

      if (session && session.userId !== ctx.user.id) {
        return { canEdit: false, editingUserName: session.userName };
      }
      return { canEdit: true, editingUserName: null };
    }),

  /** Acquire edit lock (fails if another user has it) */
  acquire: workspaceProcedure
    .input(z.object({ teamId: z.string(), userName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );
      const session = await getActiveSession(ctx.db, input.teamId);

      if (session && session.userId !== ctx.user.id) {
        return { acquired: false, editingUserName: session.userName };
      }

      await ctx.db.editSession.upsert({
        where: { teamId: input.teamId },
        create: {
          teamId: input.teamId,
          userId: ctx.user.id,
          userName: input.userName,
        },
        update: { lastSeen: new Date() },
      });
      return { acquired: true, editingUserName: null };
    }),

  /** Heartbeat to keep session alive (call every 30s) */
  heartbeat: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.editSession.updateMany({
        where: { teamId: input.teamId, userId: ctx.user.id },
        data: { lastSeen: new Date() },
      });
    }),

  /** Release edit lock when leaving */
  release: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.editSession.deleteMany({
        where: { teamId: input.teamId, userId: ctx.user.id },
      });
    }),
});
