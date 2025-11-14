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

    const active = integrations.filter((i) => i.status === "active");
    const revoked = integrations.filter((i) => i.status === "revoked");
    const error = integrations.filter((i) => i.status === "error");

    // Count by provider
    const byProvider: Record<string, number> = {};
    integrations.forEach((integration) => {
      byProvider[integration.integrationId] =
        (byProvider[integration.integrationId] ?? 0) + 1;
    });

    return {
      active,
      stats: {
        total: integrations.length,
        active: active.length,
        revoked: revoked.length,
        error: error.length,
        byProvider,
      },
    };
  }),

  get: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      return integration;
    }),

  fetchData: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        endpoint: z.string(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Integration is ${integration.status}. Please reconnect.`,
        });
      }

      if (!env.NANGO_SECRET_KEY_DEV) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Nango secret key not configured",
        });
      }

      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      try {
        const response = await nango.proxy({
          connectionId: input.connectionId,
          providerConfigKey: integration.integrationId,
          endpoint: input.endpoint,
          method: input.method,
        });

        return {
          data: response.data,
          status: response.status,
        };
      } catch (error) {
        console.error("[Integration Data Fetch]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch data from integration",
        });
      }
    }),

  revoke: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      await ctx.db.integration.update({
        where: { connectionId: input.connectionId },
        data: {
          status: "revoked",
        },
      });

      return { success: true };
    }),

  updateLastSync: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        error: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      await ctx.db.integration.update({
        where: { connectionId: input.connectionId },
        data: {
          lastSyncAt: input.error ? undefined : new Date(),
          status: input.error ? "error" : "active",
          errorMessage: input.error ?? null,
        },
      });

      return { success: true };
    }),
});
