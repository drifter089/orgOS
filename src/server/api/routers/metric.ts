import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/lib/integrations";
import { fetchData } from "@/server/api/services/data-fetching";
import {
  createChartTransformer,
  executeTransformerForMetric,
  getOrCreateMetricTransformer,
  saveDataPoints,
} from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

export const metricRouter = createTRPCRouter({
  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        integration: true,
      },
      orderBy: { name: "asc" },
    });
  }),

  getByTeamId: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.metric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          teamId: input.teamId,
        },
        include: {
          integration: true,
        },
        orderBy: { name: "asc" },
      });
    }),

  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.metric.findUnique({
        where: { id: input.id },
      });
    }),

  /**
   * Create a metric AND its dashboard metric entry in a single transaction.
   * Also creates/gets MetricTransformer, fetches initial data, and creates ChartTransformer.
   */
  create: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
        connectionId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        endpointParams: z.record(z.string()),
        teamId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify user has access to this connection
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      // Get template definition for isTimeSeries flag
      const template = getTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template not found: ${input.templateId}`,
        });
      }

      // Get position for dashboard metric
      const count = await ctx.db.dashboardMetric.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      // Step 1: Get or create MetricTransformer for this template
      // This is shared across all metrics using the same template
      const { isNew: isNewTransformer } = await getOrCreateMetricTransformer({
        templateId: input.templateId,
        integrationId: integration.integrationId,
        connectionId: input.connectionId,
        endpointConfig: input.endpointParams,
      });

      console.info(
        `[metric.create] MetricTransformer ${isNewTransformer ? "created" : "already exists"} for template: ${input.templateId}`,
      );

      // Step 2: Create metric + dashboard metric in transaction
      const dashboardMetric = await ctx.db.$transaction(
        async (tx) => {
          const metric = await tx.metric.create({
            data: {
              name: input.name,
              description: input.description,
              organizationId: ctx.workspace.organizationId,
              integrationId: input.connectionId,
              metricTemplate: input.templateId,
              endpointConfig: input.endpointParams,
              teamId: input.teamId,
              pollFrequency: template.defaultPollFrequency ?? "daily",
              nextPollAt: new Date(), // Ready to poll immediately
            },
          });

          const dm = await tx.dashboardMetric.create({
            data: {
              organizationId: ctx.workspace.organizationId,
              metricId: metric.id,
              graphType: "bar",
              graphConfig: {},
              size: "medium",
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

          return dm;
        },
        { timeout: 15000 },
      );

      // Step 3: Execute transformer and save initial data points
      const transformResult = await executeTransformerForMetric({
        templateId: input.templateId,
        integrationId: integration.integrationId,
        connectionId: input.connectionId,
        endpointConfig: input.endpointParams,
      });

      if (transformResult.success && transformResult.dataPoints) {
        const isTimeSeries = template.isTimeSeries !== false; // default true
        await saveDataPoints(
          dashboardMetric.metricId,
          transformResult.dataPoints,
          isTimeSeries,
        );

        console.info(
          `[metric.create] Saved ${transformResult.dataPoints.length} data points for metric: ${dashboardMetric.metricId}`,
        );

        // Step 4: Create ChartTransformer with initial chart config
        try {
          await createChartTransformer({
            dashboardMetricId: dashboardMetric.id,
            metricName: input.name,
            metricDescription: input.description ?? template.description,
            chartType: "line", // Default to line chart for time-series
            dateRange: "30d",
            aggregation: "none",
          });

          console.info(
            `[metric.create] Created ChartTransformer for dashboard metric: ${dashboardMetric.id}`,
          );
        } catch (chartError) {
          // Log but don't fail the entire metric creation
          console.error(
            `[metric.create] Failed to create ChartTransformer:`,
            chartError,
          );
        }
      } else {
        console.error(
          `[metric.create] Failed to execute transformer:`,
          transformResult.error,
        );
      }

      // Update lastFetchedAt
      await ctx.db.metric.update({
        where: { id: dashboardMetric.metricId },
        data: { lastFetchedAt: new Date() },
      });

      // Re-fetch to get updated data (with chart config if created)
      const result = await ctx.db.dashboardMetric.findUnique({
        where: { id: dashboardMetric.id },
        include: {
          metric: {
            include: {
              integration: true,
              roles: true,
            },
          },
        },
      });

      // Should never happen since we just created it
      if (!result) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch created dashboard metric",
        });
      }

      return result;
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.metric.update({
        where: { id },
        data,
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rolesUsingMetric = await ctx.db.role.count({
        where: { metricId: input.id },
      });

      if (rolesUsingMetric > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric. It is used by ${rolesUsingMetric} role(s).`,
        });
      }

      await ctx.db.metric.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // ===========================================================================
  // Integration Data Fetching (Single Query for dropdowns AND raw data)
  // ===========================================================================

  /**
   * Unified query for fetching integration data
   * - Used for dropdown options (cached)
   * - Used for raw data pre-fetch (cached)
   * - Supports all HTTP methods (GET, POST, etc.)
   */
  fetchIntegrationData: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        endpoint: z.string(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET"),
        params: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify user has access to this connection
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      // Fetch data from third-party API via Nango
      return await fetchData(
        input.integrationId,
        input.connectionId,
        input.endpoint,
        {
          method: input.method,
          params: input.params,
          body: input.body,
        },
      );
    }),
});
