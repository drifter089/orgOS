import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getWorkspaceContext } from "@/server/api/utils/authorization";

export const integrationRouter = createTRPCRouter({
  /**
   * List all integrations for the user's organization
   */
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
        throw new Error("Integration not found");
      }

      // Verify user has access to this integration
      if (integration.organizationId !== workspace.organizationId) {
        throw new Error("Access denied");
      }

      return integration;
    }),

  revoke: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (!integration) {
        throw new Error("Integration not found");
      }

      // Verify user has access to this integration
      if (integration.organizationId !== workspace.organizationId) {
        throw new Error("Access denied");
      }

      await ctx.db.integration.update({
        where: { connectionId: input.connectionId },
        data: {
          status: "revoked",
          updatedAt: new Date(),
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
        throw new Error("Integration not found");
      }

      // Verify user has access to this integration
      if (integration.organizationId !== workspace.organizationId) {
        throw new Error("Access denied");
      }

      await ctx.db.integration.update({
        where: { connectionId: input.connectionId },
        data: {
          lastSyncAt: input.error ? undefined : new Date(),
          status: input.error ? "error" : "active",
          errorMessage: input.error ?? null,
          updatedAt: new Date(),
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
});
