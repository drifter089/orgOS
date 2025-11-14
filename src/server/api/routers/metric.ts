import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  syncAllMetricsForOrganization,
  syncMetric,
} from "@/server/api/services/metric-sync";

export const metricRouter = createTRPCRouter({
  /**
   * Get all metrics for the current organization
   */
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      include: {
        integration: true,
        _count: {
          select: {
            dataPoints: true,
            roles: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Get metrics for a specific team (same as organization for now)
   */
  getByTeam: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      if (team.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to team metrics",
        });
      }

      return ctx.db.metric.findMany({
        where: { organizationId: ctx.workspace.organizationId },
        include: {
          integration: true,
          _count: {
            select: {
              dataPoints: true,
              roles: true,
            },
          },
        },
        orderBy: { name: "asc" },
      });
    }),

  /**
   * Create a new metric with source configuration
   */
  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        type: z.enum(["percentage", "number", "duration", "rate"]),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
        sourceType: z.enum(["integration", "scraping", "self_reported"]),
        integrationId: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        sourceConfig: z
          .object({
            scraperType: z.string().optional(),
            endpoint: z.string().optional(),
            valueJsonPath: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Validate source configuration based on type
      if (input.sourceType === "integration" && !input.integrationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Integration-based metrics must have an integrationId",
        });
      }

      if (input.sourceType === "scraping" && !input.sourceUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Scraping-based metrics must have a sourceUrl",
        });
      }

      // Verify integration exists and belongs to organization
      if (input.integrationId) {
        const integration = await ctx.db.integration.findUnique({
          where: { id: input.integrationId },
        });

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        if (integration.organizationId !== ctx.workspace.organizationId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied to integration",
          });
        }
      }

      return ctx.db.metric.create({
        data: {
          name: input.name,
          description: input.description,
          type: input.type,
          targetValue: input.targetValue,
          unit: input.unit,
          sourceType: input.sourceType,
          integrationId: input.integrationId,
          sourceUrl: input.sourceUrl,
          sourceConfig: input.sourceConfig ? JSON.parse(JSON.stringify(input.sourceConfig)) : undefined,
          organizationId: ctx.workspace.organizationId,
        },
        include: {
          integration: true,
        },
      });
    }),

  /**
   * Update metric properties and source configuration
   */
  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
        sourceType: z
          .enum(["integration", "scraping", "self_reported"])
          .optional(),
        integrationId: z.string().optional(),
        sourceUrl: z.string().url().optional(),
        sourceConfig: z
          .object({
            scraperType: z.string().optional(),
            endpoint: z.string().optional(),
            valueJsonPath: z.string().optional(),
          })
          .passthrough()
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;

      // Verify metric exists and belongs to organization
      const existing = await ctx.db.metric.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      if (existing.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to metric",
        });
      }

      // Verify integration if provided
      if (updates.integrationId) {
        const integration = await ctx.db.integration.findUnique({
          where: { id: updates.integrationId },
        });

        if (!integration) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Integration not found",
          });
        }

        if (integration.organizationId !== ctx.workspace.organizationId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Access denied to integration",
          });
        }
      }

      return ctx.db.metric.update({
        where: { id },
        data: {
          name: updates.name,
          description: updates.description,
          targetValue: updates.targetValue,
          unit: updates.unit,
          sourceType: updates.sourceType,
          integrationId: updates.integrationId,
          sourceUrl: updates.sourceUrl,
          sourceConfig: updates.sourceConfig ? JSON.parse(JSON.stringify(updates.sourceConfig)) : undefined,
        },
        include: {
          integration: true,
        },
      });
    }),

  /**
   * Delete a metric (only if not used by any roles)
   */
  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify metric exists and belongs to organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
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
          message: "Access denied to metric",
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

      return { success: true };
    }),

  /**
   * Get time-series data for a metric
   */
  getTimeSeries: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        limit: z.number().min(1).max(1000).default(100),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to organization
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
          message: "Access denied to metric",
        });
      }

      const dataPoints = await ctx.db.metricDataPoint.findMany({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "desc" },
        take: input.limit,
        skip: input.offset,
      });

      const total = await ctx.db.metricDataPoint.count({
        where: { metricId: input.metricId },
      });

      return {
        dataPoints,
        total,
        hasMore: total > input.offset + input.limit,
      };
    }),

  /**
   * Get the latest value for a metric
   */
  getLatestValue: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to organization
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
          message: "Access denied to metric",
        });
      }

      const latestDataPoint = await ctx.db.metricDataPoint.findFirst({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "desc" },
      });

      return latestDataPoint;
    }),

  /**
   * Manually refresh (sync) a single metric
   */
  refreshMetric: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to organization
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
          message: "Access denied to metric",
        });
      }

      const result = await syncMetric(ctx.db, input.metricId);

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to sync metric",
        });
      }

      return {
        success: true,
        dataPointsCreated: result.dataPointsCreated,
      };
    }),

  /**
   * Manually refresh all metrics for the organization
   */
  refreshAllMetrics: workspaceProcedure.mutation(async ({ ctx }) => {
    const result = await syncAllMetricsForOrganization(
      ctx.db,
      ctx.workspace.organizationId,
    );

    return result;
  }),

  /**
   * Report a value for a self-reported metric
   */
  reportValue: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        value: z.number(),
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
          message: "Access denied to metric",
        });
      }

      if (metric.sourceType !== "self_reported") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only report values for self-reported metrics",
        });
      }

      // Create data point
      const dataPoint = await ctx.db.metricDataPoint.create({
        data: {
          metricId: input.metricId,
          value: input.value,
          timestamp: new Date(),
        },
      });

      // Log the report as a successful sync
      await ctx.db.metricSyncLog.create({
        data: {
          metricId: input.metricId,
          status: "success",
          dataPointsCreated: 1,
          syncedAt: new Date(),
        },
      });

      return dataPoint;
    }),

  /**
   * Get sync history for a metric
   */
  getSyncHistory: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify metric belongs to organization
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
          message: "Access denied to metric",
        });
      }

      return ctx.db.metricSyncLog.findMany({
        where: { metricId: input.metricId },
        orderBy: { syncedAt: "desc" },
        take: input.limit,
      });
    }),
});
