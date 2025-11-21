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

      // Delete from Nango - this triggers a webhook that deletes from DB
      await nango.deleteConnection(
        integration.integrationId,
        input.connectionId,
      );

      return { success: true };
    }),
});
