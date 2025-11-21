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

        // Check if this is a "connection not found" error (orphaned record)
        // AxiosError from Nango has response.status and response.data
        const isAxiosError =
          error && typeof error === "object" && "response" in error;
        const responseStatus = isAxiosError
          ? (error as { response?: { status?: number } }).response?.status
          : null;
        const responseData = isAxiosError
          ? (error as { response?: { data?: unknown } }).response?.data
          : null;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        // Treat 400/404 as "not found" or check error message/response
        const isNotFoundError =
          responseStatus === 400 ||
          responseStatus === 404 ||
          errorMessage.includes("not found") ||
          errorMessage.includes("does not exist") ||
          (typeof responseData === "string" &&
            (responseData.includes("not found") ||
              responseData.includes("does not exist")));

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
