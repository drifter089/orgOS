import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  type GraphDataConfig,
  getDefaultGraphConfig,
  transformMetricToGraphData,
  validateGraphConfig,
} from "@/server/api/services/graph-transformer";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

// ============================================================================
// Input Schemas
// ============================================================================

const graphConfigSchema = z.object({
  dataSource: z.enum(["columnData", "currentValue", "customPath"]),
  xPath: z.string().optional(),
  yPath: z.string().optional(),
  aggregation: z.enum(["none", "sum", "average", "min", "max"]).optional(),
  xLabel: z.string().optional(),
  yLabel: z.string().optional(),
  generateLabels: z.boolean().optional(),
  labelPrefix: z.string().optional(),
}) satisfies z.ZodType<GraphDataConfig>;

// ============================================================================
// Dashboard Router
// ============================================================================

export const dashboardRouter = createTRPCRouter({
  /**
   * Get all dashboard metrics for the organization
   * Returns metrics configured for dashboard with their graph settings
   */
  getDashboardMetrics: workspaceProcedure.query(async ({ ctx }) => {
    const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        metric: {
          include: {
            integration: true,
          },
        },
      },
      orderBy: { position: "asc" },
    });

    return dashboardMetrics;
  }),

  /**
   * Add a metric to the dashboard
   * Creates a dashboard configuration for the metric
   */
  addMetricToDashboard: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        graphType: z.enum(["line", "bar", "area", "pie", "kpi"]),
        graphConfig: graphConfigSchema.optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric exists and belongs to organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      if (metric.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to this metric",
        });
      }

      // Check if metric is already on dashboard
      const existing = await ctx.db.dashboardMetric.findFirst({
        where: {
          organizationId: ctx.workspace.organizationId,
          metricId: input.metricId,
        },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Metric is already on dashboard",
        });
      }

      // Get default graph config if not provided
      const graphConfig = input.graphConfig ?? getDefaultGraphConfig(metric);

      // Validate config
      const validation = validateGraphConfig(graphConfig);
      if (!validation.valid) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: validation.error ?? "Invalid graph configuration",
        });
      }

      // Get current max position
      const maxPosition = await ctx.db.dashboardMetric.findFirst({
        where: { organizationId: ctx.workspace.organizationId },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      // Create dashboard metric
      return ctx.db.dashboardMetric.create({
        data: {
          organizationId: ctx.workspace.organizationId,
          metricId: input.metricId,
          graphType: input.graphType,
          graphConfig: graphConfig as unknown as Prisma.InputJsonValue,
          size: input.size ?? "medium",
          position: (maxPosition?.position ?? -1) + 1,
        },
        include: {
          metric: {
            include: {
              integration: true,
            },
          },
        },
      });
    }),

  /**
   * Update graph configuration for a dashboard metric
   */
  updateGraphConfig: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        graphType: z.enum(["line", "bar", "area", "pie", "kpi"]).optional(),
        graphConfig: graphConfigSchema.optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { dashboardMetricId, ...updates } = input;

      // Verify dashboard metric exists and belongs to organization
      const dashboardMetric = await ctx.db.dashboardMetric.findUnique({
        where: { id: dashboardMetricId },
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

      // Validate new config if provided
      if (updates.graphConfig) {
        const validation = validateGraphConfig(updates.graphConfig);
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.error ?? "Invalid graph configuration",
          });
        }
      }

      // Update dashboard metric
      return ctx.db.dashboardMetric.update({
        where: { id: dashboardMetricId },
        data: {
          ...(updates.graphType && { graphType: updates.graphType }),
          ...(updates.graphConfig && {
            graphConfig:
              updates.graphConfig as unknown as Prisma.InputJsonValue,
          }),
          ...(updates.size && { size: updates.size }),
        },
        include: {
          metric: {
            include: {
              integration: true,
            },
          },
        },
      });
    }),

  /**
   * Remove a metric from the dashboard
   */
  removeMetricFromDashboard: workspaceProcedure
    .input(z.object({ dashboardMetricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify dashboard metric exists and belongs to organization
      const dashboardMetric = await ctx.db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
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

      // Delete dashboard metric
      return ctx.db.dashboardMetric.delete({
        where: { id: input.dashboardMetricId },
      });
    }),

  /**
   * Get transformed graph data for a metric
   * Returns the metric data transformed into graph-ready format
   */
  getMetricGraphData: workspaceProcedure
    .input(z.object({ dashboardMetricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Get dashboard metric with full metric data
      const dashboardMetric = await ctx.db.dashboardMetric.findUnique({
        where: { id: input.dashboardMetricId },
        include: {
          metric: {
            include: {
              integration: true,
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

      // Transform metric data to graph format
      const graphConfig =
        dashboardMetric.graphConfig as unknown as GraphDataConfig;
      const transformResult = transformMetricToGraphData(
        dashboardMetric.metric,
        graphConfig,
      );

      if (!transformResult.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: transformResult.error ?? "Failed to transform metric data",
        });
      }

      return {
        dashboardMetric,
        graphData: transformResult.data,
      };
    }),

  /**
   * Update positions of dashboard metrics (for drag-and-drop reordering)
   */
  updatePositions: workspaceProcedure
    .input(
      z.object({
        updates: z.array(
          z.object({
            dashboardMetricId: z.string(),
            position: z.number().int().min(0),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify all dashboard metrics belong to organization
      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          id: { in: input.updates.map((u) => u.dashboardMetricId) },
          organizationId: ctx.workspace.organizationId,
        },
      });

      if (dashboardMetrics.length !== input.updates.length) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to one or more dashboard metrics",
        });
      }

      // Update positions in a transaction
      await ctx.db.$transaction(
        input.updates.map((update) =>
          ctx.db.dashboardMetric.update({
            where: { id: update.dashboardMetricId },
            data: { position: update.position },
          }),
        ),
      );

      return { success: true };
    }),

  /**
   * Get available metrics that can be added to dashboard
   * Returns metrics not yet on the dashboard
   */
  getAvailableMetrics: workspaceProcedure.query(async ({ ctx }) => {
    // Get all metrics for organization
    const allMetrics = await ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        integration: true,
      },
      orderBy: { name: "asc" },
    });

    // Get metrics already on dashboard
    const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      select: { metricId: true },
    });

    const dashboardMetricIds = new Set(
      dashboardMetrics.map((dm) => dm.metricId),
    );

    // Filter out metrics already on dashboard
    return allMetrics.filter((metric) => !dashboardMetricIds.has(metric.id));
  }),
});
