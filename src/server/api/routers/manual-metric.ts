/**
 * Manual Metric Router
 *
 * Handles operations for user-entered KPIs (no integration):
 * - create: Create manual metric
 * - addDataPoints: Batch upsert data points
 * - updateChart: Update chart for manual metrics
 * - getForUser: Get manual metrics assigned to a user
 * - getById: Get single manual metric
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { updateManualMetricChart } from "@/server/api/services/transformation";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";
import { invalidateDashboardCache } from "@/server/api/utils/cache-strategy";

export const manualMetricRouter = createTRPCRouter({
  /**
   * Create a manual metric (user-entered KPI without integration)
   * No data fetching or transformer generation needed at creation time.
   */
  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        unitType: z.enum(["number", "percentage"]),
        cadence: z.enum(["daily", "weekly", "monthly"]),
        teamId: z.string(),
        startDate: z.coerce.date().optional(),
        endDate: z.coerce.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get position for dashboard chart
      const count = await ctx.db.dashboardChart.count({
        where: { organizationId: ctx.workspace.organizationId },
      });

      // Create metric + dashboard chart in transaction
      const dashboardChart = await ctx.db.$transaction(
        async (tx) => {
          const metric = await tx.metric.create({
            data: {
              name: input.name,
              description: input.description,
              organizationId: ctx.workspace.organizationId,
              teamId: input.teamId,
              // Manual metrics have no integration or template
              integrationId: null,
              templateId: null,
              // Store manual config in endpointConfig
              endpointConfig: {
                type: "manual",
                unitType: input.unitType,
                cadence: input.cadence,
                ...(input.startDate && {
                  startDate: input.startDate.toISOString(),
                }),
                ...(input.endDate && { endDate: input.endDate.toISOString() }),
              },
              pollFrequency: "manual",
              nextPollAt: null,
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
            },
          });
        },
        { timeout: 15000 },
      );

      // Invalidate Prisma cache for dashboard queries
      await invalidateDashboardCache(
        ctx.db,
        ctx.workspace.organizationId,
        input.teamId,
      );

      return dashboardChart;
    }),

  /**
   * Add or update data points for a manual metric
   * Uses upsert to handle both new entries and updates
   */
  addDataPoints: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        dataPoints: z.array(
          z.object({
            timestamp: z.coerce.date(),
            value: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric exists and belongs to user's organization
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.metricId,
          organizationId: ctx.workspace.organizationId,
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // Verify this is a manual metric
      if (metric.integrationId !== null) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Can only add data points to manual metrics",
        });
      }

      // Batch upsert data points
      const results = await Promise.all(
        input.dataPoints.map((dp) =>
          ctx.db.metricDataPoint.upsert({
            where: {
              metricId_timestamp: {
                metricId: input.metricId,
                timestamp: dp.timestamp,
              },
            },
            create: {
              metricId: input.metricId,
              timestamp: dp.timestamp,
              value: dp.value,
            },
            update: {
              value: dp.value,
            },
          }),
        ),
      );

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { lastFetchedAt: new Date() },
      });

      return {
        success: true,
        savedCount: results.length,
      };
    }),

  /**
   * Update chart for manual metric check-ins.
   * Reuses existing transformer (no AI) or creates one if needed (AI, once).
   */
  updateChart: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      return updateManualMetricChart({ metricId: input.metricId });
    }),

  /**
   * Get all manual metrics assigned to a user via their roles
   * Groups metrics by cadence for the check-in page
   */
  getForUser: workspaceProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Find all roles assigned to this user that have manual metrics
      const rolesWithMetrics = await ctx.db.role.findMany({
        where: {
          assignedUserId: input.userId,
          metricId: { not: null },
          metric: {
            organizationId: ctx.workspace.organizationId,
            integrationId: null, // Manual metrics only
          },
        },
        include: {
          metric: {
            include: {
              dataPoints: {
                orderBy: { timestamp: "desc" },
                take: 10,
              },
              dashboardCharts: {
                select: { id: true },
                take: 1,
              },
            },
          },
          team: {
            select: { id: true, name: true },
          },
        },
      });

      // Group by cadence
      type MetricWithRole = {
        metric: NonNullable<(typeof rolesWithMetrics)[0]["metric"]>;
        role: {
          id: string;
          title: string;
          team: { id: string; name: string };
        };
      };

      const grouped: {
        daily: MetricWithRole[];
        weekly: MetricWithRole[];
        monthly: MetricWithRole[];
      } = {
        daily: [],
        weekly: [],
        monthly: [],
      };

      for (const role of rolesWithMetrics) {
        if (!role.metric) continue;

        const config = role.metric.endpointConfig as {
          type?: string;
          cadence?: string;
        } | null;
        const cadence = config?.cadence ?? "weekly";

        const metricWithRole: MetricWithRole = {
          metric: role.metric,
          role: {
            id: role.id,
            title: role.title,
            team: role.team,
          },
        };

        if (cadence === "daily") {
          grouped.daily.push(metricWithRole);
        } else if (cadence === "monthly") {
          grouped.monthly.push(metricWithRole);
        } else {
          grouped.weekly.push(metricWithRole);
        }
      }

      return grouped;
    }),

  /**
   * Get a single manual metric by ID for the metric check-in page
   */
  getById: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.metricId,
          organizationId: ctx.workspace.organizationId,
          integrationId: null, // Manual metrics only
        },
        include: {
          dataPoints: {
            orderBy: { timestamp: "desc" },
            take: 10,
          },
          roles: {
            include: {
              team: {
                select: { id: true, name: true },
              },
            },
          },
          dashboardCharts: {
            select: { id: true },
            take: 1,
          },
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Manual metric not found",
        });
      }

      return metric;
    }),
});
