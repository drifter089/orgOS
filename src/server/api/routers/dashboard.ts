import type { Metric, Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { fetchData, getMetricTemplate } from "@/server/api/services/base";
import {
  type ChartTransformResult,
  transformMetricWithAI,
} from "@/server/api/services/graph-transformer";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

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

      // Get current max position
      const maxPosition = await ctx.db.dashboardMetric.findFirst({
        where: { organizationId: ctx.workspace.organizationId },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      // Create dashboard metric with empty config (will be populated by AI transform)
      return ctx.db.dashboardMetric.create({
        data: {
          organizationId: ctx.workspace.organizationId,
          metricId: input.metricId,
          graphType: "bar", // Default, will be updated by AI
          graphConfig: {}, // Empty, will be populated by transformMetricForChart
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
   * Stores the AI-generated chart transform result
   */
  updateGraphConfig: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        chartTransform: z
          .object({
            chartType: z.enum([
              "line",
              "bar",
              "area",
              "pie",
              "radar",
              "radial",
              "kpi",
            ]),
            chartData: z.array(z.record(z.union([z.string(), z.number()]))),
            chartConfig: z.record(
              z.object({
                label: z.string(),
                color: z.string(),
              }),
            ),
            xAxisKey: z.string(),
            dataKeys: z.array(z.string()),
            // Rich chart metadata
            title: z.string(),
            description: z.string(),
            xAxisLabel: z.string(),
            yAxisLabel: z.string(),
            // Feature flags
            showLegend: z.boolean(),
            showTooltip: z.boolean(),
            stacked: z.boolean().optional(),
            // Pie/Radial specific
            centerLabel: z
              .object({
                value: z.string(),
                label: z.string(),
              })
              .optional(),
            reasoning: z.string(),
          })
          .optional(),
        size: z.enum(["small", "medium", "large"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { dashboardMetricId, chartTransform, size } = input;

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

      // Update dashboard metric
      return ctx.db.dashboardMetric.update({
        where: { id: dashboardMetricId },
        data: {
          ...(chartTransform && {
            graphType: chartTransform.chartType,
            graphConfig: chartTransform as unknown as Prisma.InputJsonValue,
          }),
          ...(size && { size }),
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
   * Fetch fresh data for a metric from its integration
   * Returns raw data for preview before AI transformation
   */
  fetchMetricData: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get metric with integration
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        include: { integration: true },
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

      // Check if this is an integration-backed metric
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

      const template = getMetricTemplate(metric.metricTemplate);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric template not found",
        });
      }

      // Fetch data using new base function
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

      return {
        data: result.data,
        status: result.status,
        metricId: metric.id,
        integrationId: metric.integration.integrationId,
        template: template.templateId,
      };
    }),

  /**
   * Transform metric data for chart visualization using AI
   * Uses provided data or fetches fresh data, then transforms to Recharts format
   */
  transformMetricForChart: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        rawData: z
          .unknown()
          .optional()
          .describe("Pre-fetched raw data to transform (avoids re-fetching)"),
        userHint: z
          .string()
          .optional()
          .describe(
            "Optional hint like 'show as pie chart' or 'group by month'",
          ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get metric with full data
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
        include: {
          integration: true,
        },
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

      // Use provided rawData or fetch fresh data from integration
      let metricWithFreshData: Metric = metric;

      // If rawData is provided, use it directly
      if (input.rawData !== undefined) {
        metricWithFreshData = {
          ...metric,
          endpointConfig: input.rawData as Prisma.JsonValue,
        };
      } else if (
        metric.integrationId &&
        metric.metricTemplate &&
        metric.integration
      ) {
        // Fetch fresh data from integration
        const template = getMetricTemplate(metric.metricTemplate);

        if (template) {
          // Fetch fresh data using new base function
          const params =
            (metric.endpointConfig as Record<string, string>) ?? {};

          try {
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

            // Create metric with fresh data in endpointConfig for AI
            metricWithFreshData = {
              ...metric,
              endpointConfig: result.data as Prisma.JsonValue,
            };
          } catch {
            // Continue with existing endpointConfig on fetch failure
          }
        }
      }

      // Transform using AI
      const result = await transformMetricWithAI(
        metricWithFreshData,
        input.userHint,
      );

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "AI transformation failed",
        });
      }

      return {
        success: true,
        data: result.data,
      };
    }),

  /**
   * Get stored chart configuration for a dashboard metric
   * Returns the previously transformed chart data if available
   */
  getStoredChartData: workspaceProcedure
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

      // Return stored chart config
      const graphConfig =
        dashboardMetric.graphConfig as unknown as ChartTransformResult | null;

      return {
        dashboardMetric,
        chartData: graphConfig,
        hasChartData: !!(
          graphConfig?.chartData && graphConfig.chartData.length > 0
        ),
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
