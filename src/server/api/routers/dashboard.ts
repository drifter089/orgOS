import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/app/metric/registry";
import { transformMetricWithAI } from "@/server/api/services/chart-tools/ai-transformer";
import { fetchData } from "@/server/api/services/nango";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  getDashboardMetrics: workspaceProcedure
    .input(z.object({ teamId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          ...(input?.teamId && {
            metric: { teamId: input.teamId },
          }),
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
        orderBy: { position: "asc" },
      });

      return dashboardMetrics;
    }),

  refreshMetricChart: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        userHint: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dashboardMetric = await ctx.db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });

      if (!dashboardMetric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard metric not found",
        });
      }

      if (dashboardMetric.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this dashboard metric",
        });
      }

      const { metric } = dashboardMetric;

      if (
        !metric.integrationId ||
        !metric.metricTemplate ||
        !metric.integration
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This metric is not integration-backed",
        });
      }

      const template = getTemplate(metric.metricTemplate);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric template not found",
        });
      }

      const params = (metric.endpointConfig as Record<string, string>) ?? {};
      const result = await fetchData(
        metric.integration.integrationId,
        metric.integrationId,
        template.metricEndpoint,
        {
          method: template.method ?? "GET",
          params,
          body: template.requestBody,
        },
      );

      console.info(
        `[Dashboard] Fetched data for ${metric.name}:`,
        Array.isArray(result.data)
          ? `Array with ${result.data.length} items`
          : typeof result.data,
      );

      // Transform raw data with AI (no preprocessing!)
      const transformResult = await transformMetricWithAI(
        metric,
        result.data,
        input.userHint,
      );

      if (!transformResult.success || !transformResult.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: transformResult.error ?? "AI transformation failed",
        });
      }

      return ctx.db.dashboardMetric.update({
        where: { id: input.dashboardMetricId },
        data: {
          graphType: transformResult.data.chartType,
          graphConfig: transformResult.data as unknown as Prisma.InputJsonValue,
          metric: {
            update: {
              lastFetchedAt: new Date(),
            },
          },
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });
    }),

  importAllAvailableMetrics: workspaceProcedure
    .input(z.object({ teamId: z.string().optional() }).optional())
    .mutation(async ({ ctx, input }) => {
      const allMetrics = await ctx.db.metric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          ...(input?.teamId && { teamId: input.teamId }),
        },
        select: { id: true },
      });

      const existingDashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          ...(input?.teamId && {
            metric: { teamId: input.teamId },
          }),
        },
        select: { metricId: true, position: true },
      });

      const dashboardMetricIds = new Set(
        existingDashboardMetrics.map((dm) => dm.metricId),
      );

      const maxPosition =
        existingDashboardMetrics.reduce(
          (max, dm) => Math.max(max, dm.position),
          -1,
        ) + 1;

      const metricsToAdd = allMetrics.filter(
        (metric) => !dashboardMetricIds.has(metric.id),
      );

      if (metricsToAdd.length === 0) {
        return {
          added: 0,
          message: "All metrics are already on the dashboard",
          newDashboardMetrics: [],
        };
      }

      const newDashboardMetrics = await ctx.db.$transaction(async (tx) => {
        await tx.dashboardMetric.createMany({
          data: metricsToAdd.map((metric, index) => ({
            organizationId: ctx.workspace.organizationId,
            metricId: metric.id,
            graphType: "bar",
            graphConfig: {},
            size: "medium",
            position: maxPosition + index,
          })),
        });

        return tx.dashboardMetric.findMany({
          where: {
            organizationId: ctx.workspace.organizationId,
            metricId: { in: metricsToAdd.map((m) => m.id) },
          },
          include: {
            metric: {
              include: {
                integration: true,
                roles: true,
              },
            },
          },
          orderBy: { position: "asc" },
        });
      });

      return {
        added: metricsToAdd.length,
        message: `Added ${metricsToAdd.length} metric${metricsToAdd.length === 1 ? "" : "s"} to dashboard`,
        newDashboardMetrics,
      };
    }),

  // ===========================================================================
  // New Optimized Mutations
  // ===========================================================================

  /**
   * Create a dashboard metric for displaying a metric on the dashboard
   * Used after metric.create() to add it to the dashboard
   */
  createDashboardMetric: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        graphType: z.string().default("bar"),
        graphConfig: z.record(z.unknown()).default({}),
        size: z.enum(["small", "medium", "large"]).default("medium"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Use count + 1 for position - faster than aggregate MAX
      const count = await ctx.db.dashboardMetric.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      return ctx.db.dashboardMetric.create({
        data: {
          organizationId: ctx.workspace.organizationId,
          metricId: input.metricId,
          graphType: input.graphType,
          graphConfig: input.graphConfig as Prisma.InputJsonValue,
          size: input.size,
          position: count,
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });
    }),

  /**
   * Update only the chart data for a dashboard metric
   * Used after AI transformation completes
   */
  updateDashboardMetricChart: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        graphType: z.string(),
        graphConfig: z.record(z.unknown()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const existing = await ctx.db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
        select: { organizationId: true },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard metric not found",
        });
      }

      if (existing.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this dashboard metric",
        });
      }

      return ctx.db.dashboardMetric.update({
        where: { id: input.dashboardMetricId },
        data: {
          graphType: input.graphType,
          graphConfig: input.graphConfig as Prisma.InputJsonValue,
          metric: {
            update: {
              lastFetchedAt: new Date(),
            },
          },
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });
    }),

  /**
   * Create both metric AND dashboard metric in a single API call
   * This reduces network round trips from 2 to 1
   */
  createMetricWithDashboard: workspaceProcedure
    .input(
      z.object({
        // Metric fields
        templateId: z.string(),
        connectionId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        endpointParams: z.record(z.string()),
        teamId: z.string().optional(),
        // Dashboard metric fields
        graphType: z.string().default("bar"),
        graphConfig: z.record(z.unknown()).default({}),
        size: z.enum(["small", "medium", "large"]).default("medium"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get position count
      const count = await ctx.db.dashboardMetric.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      // Create metric first
      const metric = await ctx.db.metric.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: ctx.workspace.organizationId,
          integrationId: input.connectionId,
          metricTemplate: input.templateId,
          endpointConfig: input.endpointParams,
          teamId: input.teamId,
        },
      });

      // Create dashboard metric using the metric we just created
      return ctx.db.dashboardMetric.create({
        data: {
          organizationId: ctx.workspace.organizationId,
          metricId: metric.id,
          graphType: input.graphType,
          graphConfig: input.graphConfig as Prisma.InputJsonValue,
          size: input.size,
          position: count,
        },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });
    }),

  /**
   * Transform raw API data into chart format using AI
   * Called from frontend with pre-fetched data for faster UX
   */
  transformChartWithAI: workspaceProcedure
    .input(
      z.object({
        metricConfig: z.object({
          name: z.string(),
          description: z.string().optional(),
          metricTemplate: z.string(),
          endpointConfig: z.record(z.string()),
        }),
        rawData: z.unknown(),
        userHint: z.string().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Create a metric-like object for the AI transformer
      const metricLike = {
        id: "",
        name: input.metricConfig.name,
        description: input.metricConfig.description ?? null,
        organizationId: "",
        teamId: null,
        integrationId: null,
        metricTemplate: input.metricConfig.metricTemplate,
        endpointConfig: input.metricConfig.endpointConfig,
        lastFetchedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await transformMetricWithAI(
        metricLike,
        input.rawData,
        input.userHint,
      );

      if (!result.success || !result.data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "AI transformation failed",
        });
      }

      return result.data;
    }),
});
