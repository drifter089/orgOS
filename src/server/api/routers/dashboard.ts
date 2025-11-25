import type { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/app/metric/registry";
import { transformMetricWithAI } from "@/server/api/services/chart-tools/ai-transformer";
import { fetchData } from "@/server/api/services/nango";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

export const dashboardRouter = createTRPCRouter({
  getByTeam: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Simple query - just ensure team is in user's org
      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          teamId: input.teamId,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
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

  addMetricToDashboard: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
        metricId: z.string(),
        size: z.enum(["small", "medium", "large"]).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify metric belongs to the team
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.metricId,
          teamId: input.teamId,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or does not belong to this team",
        });
      }

      // Check if already on dashboard
      const existing = await ctx.db.dashboardMetric.findFirst({
        where: {
          teamId: input.teamId,
          metricId: input.metricId,
        },
      });

      if (existing) {
        return ctx.db.dashboardMetric.findUnique({
          where: { id: existing.id },
          include: {
            metric: {
              include: {
                integration: true,
              },
            },
          },
        });
      }

      // Calculate next position
      const maxPosition = await ctx.db.dashboardMetric.findFirst({
        where: { teamId: input.teamId },
        orderBy: { position: "desc" },
        select: { position: true },
      });

      return ctx.db.dashboardMetric.create({
        data: {
          teamId: input.teamId,
          metricId: input.metricId,
          graphType: "bar",
          graphConfig: {},
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

  refreshMetricChart: workspaceProcedure
    .input(
      z.object({
        dashboardMetricId: z.string(),
        userHint: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const dashboardMetric = await ctx.db.dashboardMetric.findFirst({
        where: {
          id: input.dashboardMetricId,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
        include: {
          metric: {
            include: {
              integration: true,
            },
          },
          team: true,
        },
      });

      if (!dashboardMetric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Dashboard metric not found or access denied",
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

      // Transform raw data with AI
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
            },
          },
        },
      });
    }),

  importAllAvailableMetrics: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify team exists and is in user's org
      const team = await ctx.db.team.findFirst({
        where: {
          id: input.teamId,
          organizationId: ctx.workspace.organizationId,
        },
      });

      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Team not found or access denied",
        });
      }

      const allMetrics = await ctx.db.metric.findMany({
        where: { teamId: input.teamId },
        select: { id: true },
      });

      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: { teamId: input.teamId },
        select: { metricId: true, position: true },
      });

      const dashboardMetricIds = new Set(
        dashboardMetrics.map((dm) => dm.metricId),
      );

      const maxPosition =
        dashboardMetrics.reduce((max, dm) => Math.max(max, dm.position), -1) +
        1;

      const metricsToAdd = allMetrics.filter(
        (metric) => !dashboardMetricIds.has(metric.id),
      );

      if (metricsToAdd.length === 0) {
        return {
          added: 0,
          message: "All metrics are already on the dashboard",
        };
      }

      await ctx.db.dashboardMetric.createMany({
        data: metricsToAdd.map((metric, index) => ({
          teamId: input.teamId,
          metricId: metric.id,
          graphType: "bar",
          graphConfig: {},
          size: "medium",
          position: maxPosition + index,
        })),
      });

      return {
        added: metricsToAdd.length,
        message: `Added ${metricsToAdd.length} metric${metricsToAdd.length === 1 ? "" : "s"} to dashboard`,
      };
    }),
});
