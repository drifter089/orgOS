/**
 * Integration Metrics Router
 *
 * Handles metric creation, configuration, and management for third-party integrations.
 * Separated from integration.ts to keep code organized.
 */

import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { env } from "@/env";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getWorkspaceContext } from "@/server/api/utils/authorization";

export const integrationMetricsRouter = createTRPCRouter({
  // Get available metric templates for an integration
  getAvailableTemplates: protectedProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(async ({ input }) => {
      const { getTemplatesForIntegration } = await import(
        "@/server/nango/metric-templates"
      );
      return getTemplatesForIntegration(input.integrationId);
    }),

  // Get selectable sources (events, sheets) for metric creation
  getSelectableSources: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        sourceType: z.enum(["event", "sheet"]),
        nangoModel: z.string(),
        projectId: z.string().optional(), // For PostHog: project_id to filter events
      }),
    )
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (
        !integration ||
        integration.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      const { getAvailableSources } = await import("@/server/nango/nango-extractors");

      // Pass projectId to getAvailableSources for PostHog filtering
      const sources = await getAvailableSources(
        nango,
        input.connectionId,
        input.integrationId,
        input.sourceType,
        input.nangoModel,
        input.projectId, // Pass projectId for PostHog
      );

      return sources;
    }),

  // Get available PostHog projects for project selection
  getPostHogProjects: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (
        !integration ||
        integration.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      try {
        const response = await nango.proxy({
          connectionId: input.connectionId,
          providerConfigKey: integration.integrationId,
          endpoint: "/api/projects/",
          method: "GET",
        });

        const projects = response.data as {
          results: Array<{ id: number; name: string }>;
        };

        return {
          projects: projects.results.map((p) => ({
            id: p.id.toString(),
            name: p.name,
          })),
        };
      } catch (error) {
        console.error("[Get PostHog Projects]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch PostHog projects",
        });
      }
    }),

  // Create metric from integration
  create: protectedProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        templateId: z.string(),
        sourceId: z.string(),
        config: z.any(),
        metricName: z.string(),
        targetValue: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
      });

      if (
        !integration ||
        integration.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const { getTemplate, getSourceType } = await import(
        "@/server/nango/metric-templates"
      );
      const template = getTemplate(input.integrationId, input.templateId);

      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric template not found",
        });
      }

      // Create Metric
      const metric = await ctx.db.metric.create({
        data: {
          name: input.metricName,
          organizationId: workspace.organizationId,
          source: "nango",
          type: template.type,
          targetValue: input.targetValue,
          unit: template.defaultUnit,
        },
      });

      // Create IntegrationMetric link
      await ctx.db.integrationMetric.create({
        data: {
          integrationId: integration.id,
          metricId: metric.id,
          sourceType: getSourceType(input.templateId),
          sourceId: input.sourceId,
          sourceConfig: {
            templateId: input.templateId,
            ...input.config,
          },
          nangoModel: template.nangoModel,
          status: "active",
        },
      });

      return metric;
    }),

  // List all metrics for current organization
  list: protectedProcedure.query(async ({ ctx }) => {
    const workspace = await getWorkspaceContext(ctx.user.id);

    const metrics = await ctx.db.metric.findMany({
      where: {
        organizationId: workspace.organizationId,
        source: "nango",
      },
      include: {
        integrationMetrics: {
          include: {
            integration: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return metrics;
  }),

  // List metrics for a specific integration
  listByIntegration: protectedProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const integration = await ctx.db.integration.findUnique({
        where: { connectionId: input.connectionId },
        include: {
          integrationMetrics: {
            include: {
              metric: true,
            },
          },
        },
      });

      if (
        !integration ||
        integration.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return integration.integrationMetrics.map((im) => ({
        ...im.metric,
        integrationMetric: {
          id: im.id,
          sourceType: im.sourceType,
          sourceId: im.sourceId,
          sourceConfig: im.sourceConfig,
          status: im.status,
          errorMessage: im.errorMessage,
          lastValidatedAt: im.lastValidatedAt,
        },
      }));
    }),

  // Refresh metric value and check staleness
  refresh: protectedProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        include: {
          integrationMetrics: {
            include: { integration: true },
          },
        },
      });

      if (
        !metric ||
        metric.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const integrationMetric = metric.integrationMetrics[0];
      if (!integrationMetric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No integration source found",
        });
      }

      const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

      // For PostHog, set project_id from sourceConfig
      if (
        integrationMetric.integration.integrationId === "posthog" &&
        (integrationMetric.sourceConfig as any)?.projectId
      ) {
        try {
          await nango.setMetadata(
            integrationMetric.integration.integrationId,
            integrationMetric.integration.connectionId,
            {
              project_id: (integrationMetric.sourceConfig as any).projectId,
            },
          );
        } catch (error) {
          console.error("[Refresh Metric - Set Project]", error);
        }
      }

      const { extractMetricValue } = await import("@/server/nango/nango-extractors");

      const result = await extractMetricValue(
        nango,
        integrationMetric as any,
        integrationMetric.integration.connectionId,
        integrationMetric.integration.integrationId,
      );

      // Update metric
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { currentValue: result.value },
      });

      // Update integration metric status
      await ctx.db.integrationMetric.update({
        where: { id: integrationMetric.id },
        data: {
          status: result.isStale ? "stale" : "active",
          errorMessage: result.error || null,
          lastValidatedAt: new Date(),
          lastSyncedAt: result.lastModified
            ? new Date(result.lastModified)
            : undefined,
        },
      });

      return {
        value: result.value,
        isStale: result.isStale,
        error: result.error,
        recordCount: result.recordCount,
      };
    }),

  // Delete a metric (and its integration link)
  delete: protectedProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const workspace = await getWorkspaceContext(ctx.user.id);

      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (
        !metric ||
        metric.organizationId !== workspace.organizationId
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check if metric is used by any roles
      const rolesUsingMetric = await ctx.db.role.count({
        where: { metricId: input.metricId },
      });

      if (rolesUsingMetric > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric. It is used by ${rolesUsingMetric} role(s).`,
        });
      }

      // Delete metric (cascade will delete IntegrationMetric)
      await ctx.db.metric.delete({
        where: { id: input.metricId },
      });

      return { success: true };
    }),
});
