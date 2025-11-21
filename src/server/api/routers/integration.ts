import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

export const integrationRouter = createTRPCRouter({
  listWithStats: workspaceProcedure.query(async ({ ctx }) => {
    const integrations = await ctx.db.integration.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      orderBy: { createdAt: "desc" },
    });

    const byProvider: Record<string, number> = {};
    integrations.forEach((integration) => {
      byProvider[integration.integrationId] =
        (byProvider[integration.integrationId] ?? 0) + 1;
    });

    return {
      active: integrations,
      stats: {
        total: integrations.length,
        active: integrations.length,
        byProvider,
      },
    };
  }),

  revoke: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (!env.NANGO_SECRET_KEY_DEV) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Nango secret key not configured",
        });
      }

      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      // Try to delete from Nango (triggers webhook that deletes from DB)
      try {
        await nango.deleteConnection(
          integration.integrationId,
          input.connectionId,
        );
      } catch (error) {
        console.error("[Nango Connection Delete]", error);

        // Only do direct DB deletion if connection doesn't exist in Nango (orphaned record)
        // For other errors (auth, rate limit, etc.), throw the error
        const isNotFoundError =
          error instanceof Error &&
          (error.message.includes("not found") ||
            error.message.includes("does not exist") ||
            error.message.includes("404"));

        if (isNotFoundError) {
          // Connection doesn't exist in Nango but exists in DB - clean up orphaned record
          await ctx.db.integration.delete({
            where: { connectionId: input.connectionId },
          });
          return { success: true };
        }

        // For other errors, re-throw
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to delete integration from Nango",
        });
      }

      return { success: true };
    }),
});
