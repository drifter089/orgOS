import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

function getNangoClient() {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }
  return new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });
}

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

      const nango = getNangoClient();

      try {
        const connectionExists = await nango
          .getConnection(integration.integrationId, input.connectionId)
          .catch(() => null);

        if (!connectionExists) {
          await ctx.db.integration.update({
            where: { connectionId: input.connectionId },
            data: { status: "revoked" },
          });

          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Connection no longer exists in Nango. Please reconnect.",
          });
        }

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

        if (error instanceof TRPCError) {
          throw error;
        }

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

  delete: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.status === "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete active integration. Please revoke it first.",
        });
      }

      await ctx.db.integration.delete({
        where: { connectionId: input.connectionId },
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

  verify: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      const nango = getNangoClient();

      try {
        const connection = await nango.getConnection(
          integration.integrationId,
          input.connectionId,
        );

        if (integration.status !== "active") {
          await ctx.db.integration.update({
            where: { connectionId: input.connectionId },
            data: { status: "active", errorMessage: null },
          });
        }

        return {
          exists: true,
          status: "active",
          connection,
        };
      } catch {
        await ctx.db.integration.update({
          where: { connectionId: input.connectionId },
          data: { status: "revoked" },
        });

        return {
          exists: false,
          status: "revoked",
        };
      }
    }),

  syncWithNango: workspaceProcedure.mutation(async ({ ctx }) => {
    const integrations = await ctx.db.integration.findMany({
      where: {
        organizationId: ctx.workspace.organizationId,
        status: "active",
      },
    });

    const nango = getNangoClient();
    const results = {
      verified: 0,
      revoked: 0,
      errors: 0,
    };

    for (const integration of integrations) {
      try {
        await nango.getConnection(
          integration.integrationId,
          integration.connectionId,
        );
        results.verified++;
      } catch {
        await ctx.db.integration.update({
          where: { connectionId: integration.connectionId },
          data: { status: "revoked" },
        });
        results.revoked++;
      }
    }

    return {
      ...results,
      total: integrations.length,
      message: `Synced ${results.total} integrations: ${results.verified} verified, ${results.revoked} revoked`,
    };
  }),
});
