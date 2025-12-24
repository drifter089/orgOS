import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/lib/integrations";
import { fetchData } from "@/server/api/services/data-fetching";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  getIntegrationAndVerifyAccess,
  getMetricAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";
import { invalidateCacheByTags } from "@/server/api/utils/cache-strategy";

import { runBackgroundTask } from "./pipeline";

export const metricRouter = createTRPCRouter({
  // ===========================================================================
  // Status Polling (lightweight endpoint for card-level polling)
  // ===========================================================================

  /**
   * Lightweight status endpoint for card-level polling.
   * Returns only the fields needed to display pipeline progress.
   */
  getStatus: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.metric.findUnique({
        where: { id: input.metricId },
        select: { id: true, refreshStatus: true, lastError: true },
      });
    }),

  /**
   * Batch status endpoint for provider-level polling.
   * Single query for all processing metrics - more efficient than N individual queries.
   * Returns a map of metricId -> { refreshStatus, lastError }
   */
  getBatchStatus: workspaceProcedure
    .input(z.object({ metricIds: z.array(z.string()) }))
    .query(async ({ ctx, input }) => {
      if (input.metricIds.length === 0) return {};

      const metrics = await ctx.db.metric.findMany({
        where: {
          id: { in: input.metricIds },
          organizationId: ctx.workspace.organizationId,
        },
        select: { id: true, refreshStatus: true, lastError: true },
      });

      return Object.fromEntries(
        metrics.map((m) => [
          m.id,
          { refreshStatus: m.refreshStatus, lastError: m.lastError },
        ]),
      );
    }),

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
      // Verify team belongs to user's organization
      await getTeamAndVerifyAccess(
        ctx.db,
        input.teamId,
        ctx.user.id,
        ctx.workspace,
      );

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
      // Verify metric belongs to user's organization
      return getMetricAndVerifyAccess(
        ctx.db,
        input.id,
        ctx.workspace.organizationId,
      );
    }),

  /**
   * Create a metric with initial data.
   * Uses the unified pipeline (hard-refresh) which handles:
   * - API fetch
   * - Transformer generation
   * - Data point saving
   * - Chart transformer generation
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
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      // Get template definition
      const template = getTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template not found: ${input.templateId}`,
        });
      }

      // Get position for dashboard chart
      const count = await ctx.db.dashboardChart.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      // Step 1: Create metric + dashboard chart in transaction
      const dashboardChart = await ctx.db.$transaction(
        async (tx) => {
          const metric = await tx.metric.create({
            data: {
              name: input.name,
              description: input.description,
              organizationId: ctx.workspace.organizationId,
              integrationId: input.connectionId,
              templateId: input.templateId,
              endpointConfig: input.endpointParams,
              teamId: input.teamId,
              pollFrequency: template.defaultPollFrequency ?? "daily",
              nextPollAt: new Date(),
              // Set initial refresh status so frontend knows pipeline is starting
              refreshStatus: "fetching-api-data",
            },
          });

          return tx.dashboardChart.create({
            data: {
              organizationId: ctx.workspace.organizationId,
              metricId: metric.id,
              chartType: "line",
              chartConfig: {},
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
              chartTransformer: {
                select: {
                  chartType: true,
                  cadence: true,
                  userPrompt: true,
                  updatedAt: true,
                  selectedDimension: true,
                },
              },
            },
          });
        },
        { timeout: 15000 },
      );

      // Invalidate Prisma cache before returning so frontend refetch gets fresh data
      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (input.teamId) cacheTags.push(`dashboard_team_${input.teamId}`);
      await invalidateCacheByTags(ctx.db, cacheTags);

      void runBackgroundTask({
        metricId: dashboardChart.metricId,
        type: "hard-refresh",
        organizationId: ctx.workspace.organizationId,
        teamId: input.teamId,
      });

      return dashboardChart;
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

      // Verify metric belongs to user's organization
      const existing = await getMetricAndVerifyAccess(
        ctx.db,
        id,
        ctx.workspace.organizationId,
      );

      const metric = await ctx.db.metric.update({
        where: { id },
        data,
      });

      const cacheTags = [`dashboard_org_${ctx.workspace.organizationId}`];
      if (existing.teamId) {
        cacheTags.push(`dashboard_team_${existing.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

      return metric;
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get metric info before deletion for cache invalidation
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
        select: { teamId: true, organizationId: true },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

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

      // Invalidate Prisma cache for dashboard queries
      const cacheTags = [`dashboard_org_${metric.organizationId}`];
      if (metric.teamId) {
        cacheTags.push(`dashboard_team_${metric.teamId}`);
      }
      await invalidateCacheByTags(ctx.db, cacheTags);

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
