/**
 * Custom Integration Router
 *
 * tRPC router for managing custom (non-Nango) integrations.
 * Supports integrations like Instagram via URL, custom APIs, webhooks, etc.
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getWorkspaceContext } from "@/server/api/utils/authorization";
import {
  createCustomIntegration,
  updateCustomIntegration,
  validateCustomConfig,
  type CustomIntegrationConfig,
} from "@/server/integrations/custom-integration-handler";

export const customIntegrationRouter = createTRPCRouter({
  // Create a new custom integration
  create: protectedProcedure
    .input(
      z.object({
        integrationId: z.string().min(1), // e.g., "instagram", "custom-api"
        type: z.enum(["api", "webhook", "manual"]),
        url: z.string().url().optional(),
        authMethod: z.enum(["none", "api_key", "oauth"]).optional(),
        apiKey: z.string().optional(),
        pollingInterval: z.number().min(5).optional(), // Minimum 5 minutes
        dataExtractor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const config: CustomIntegrationConfig = {
        type: input.type,
        url: input.url,
        authMethod: input.authMethod,
        apiKey: input.apiKey,
        pollingInterval: input.pollingInterval,
        dataExtractor: input.dataExtractor,
      };

      // Validate configuration
      const validation = validateCustomConfig(config);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Invalid configuration: ${validation.errors.join(", ")}`,
        });
      }

      // Create integration
      const integration = await createCustomIntegration(
        ctx.db,
        workspace.organizationId,
        ctx.user.id,
        input.integrationId,
        config,
      );

      return integration;
    }),

  // List all custom integrations for the organization
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    const integrations = await ctx.db.integration.findMany({
      where: {
        organizationId: workspace.organizationId,
        type: "custom",
      },
      orderBy: { createdAt: "desc" },
    });

    return integrations;
  }),

  // Get a specific custom integration
  get: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { id: input.integrationId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.organizationId !== workspace.organizationId ||
        integration.type !== "custom"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return integration;
    }),

  // Update custom integration configuration
  update: protectedProcedure
    .input(
      z.object({
        integrationId: z.string(),
        type: z.enum(["api", "webhook", "manual"]).optional(),
        url: z.string().url().optional(),
        authMethod: z.enum(["none", "api_key", "oauth"]).optional(),
        apiKey: z.string().optional(),
        pollingInterval: z.number().min(5).optional(),
        dataExtractor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      // Verify ownership
      const integration = await ctx.db.integration.findUnique({
        where: { id: input.integrationId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.organizationId !== workspace.organizationId ||
        integration.type !== "custom"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Update configuration
      const { integrationId, ...config } = input;
      const updated = await updateCustomIntegration(
        ctx.db,
        integrationId,
        config,
      );

      return updated;
    }),

  // Delete custom integration
  delete: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { id: input.integrationId },
      });

      if (!integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      if (
        integration.organizationId !== workspace.organizationId ||
        integration.type !== "custom"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Delete the integration (cascade will delete related metrics)
      await ctx.db.integration.delete({
        where: { id: input.integrationId },
      });

      return { success: true };
    }),
});
