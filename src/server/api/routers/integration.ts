import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getWorkspaceContext } from "@/server/api/utils/authorization";

export const integrationRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    const integrations = await ctx.db.integration.findMany({
      where: {
        organizationId: workspace.organizationId,
        status: "active",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return integrations;
  }),

  get: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return integration;
    }),

  fetchData: protectedProcedure
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
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

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

  revoke: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      await ctx.db.integration.update({
        where: { connectionId: input.connectionId },
        data: {
          status: "revoked",
        },
      });

      return { success: true };
    }),

  updateLastSync: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        error: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

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

  stats: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    const integrations = await ctx.db.integration.findMany({
      where: { organizationId: workspace.organizationId },
    });

    const stats = {
      total: integrations.length,
      active: integrations.filter((i) => i.status === "active").length,
      revoked: integrations.filter((i) => i.status === "revoked").length,
      error: integrations.filter((i) => i.status === "error").length,
      byProvider: {} as Record<string, number>,
    };

    // Count by provider
    integrations.forEach((integration) => {
      stats.byProvider[integration.integrationId] =
        (stats.byProvider[integration.integrationId] ?? 0) + 1;
    });

    return stats;
  }),

  // ===== NEW: Nango Sync Procedures =====

  // List available syncs for a provider
  listAvailableSyncs: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(async ({ input }) => {
      // Map of provider to available syncs (from nango.yaml)
      const syncMap: Record<string, string[]> = {
        posthog: ["active-users", "total-events", "conversion-rate"],
        "google-sheets": ["sheet-rows", "sheet-metadata"],
        slack: ["channel-messages", "active-users", "channels"],
      };

      return syncMap[input.integrationId] || [];
    }),

  // Get synced records from Nango's cache
  getSyncedRecords: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        model: z.string(),
        limit: z.number().min(1).max(1000).default(100),
        cursor: z.string().optional(),
        sortBy: z.string().optional(),
        order: z.enum(["asc", "desc"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      // Verify integration access
      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Query Nango's cache for synced records
      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      try {
        const result = await nango.listRecords({
          providerConfigKey: input.integrationId,
          connectionId: input.connectionId,
          model: input.model,
          limit: input.limit,
          cursor: input.cursor,
        });

        return {
          records: result.records,
          nextCursor: result.next_cursor,
          totalCount: result.records.length,
        };
      } catch (error) {
        console.error("[Get Synced Records]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch synced records",
        });
      }
    }),

  // Trigger a sync manually
  triggerSync: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        syncName: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      // Verify integration access
      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Trigger sync via Nango API
      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      try {
        await nango.triggerSync(
          input.integrationId,
          [input.syncName],
          input.connectionId
        );

        return {
          success: true,
          message: `Triggered ${input.syncName} sync for ${input.integrationId}`,
        };
      } catch (error) {
        console.error("[Trigger Sync]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error ? error.message : "Failed to trigger sync",
        });
      }
    }),

  // Get sync status and metadata
  getSyncStatus: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      // Verify integration access
      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (integration.organizationId !== workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Get connection and sync status from Nango
      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      try {
        const connection = await nango.getConnection(
          input.integrationId,
          input.connectionId
        );

        return {
          connectionId: connection.id,
          provider: connection.provider_config_key,
          createdAt: connection.created_at,
          metadata: connection.metadata,
          connectionConfig: connection.connection_config,
        };
      } catch (error) {
        console.error("[Get Sync Status]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to get sync status",
        });
      }
    }),
});
