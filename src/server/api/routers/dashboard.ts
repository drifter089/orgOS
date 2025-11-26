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

      const dashboardMetrics = await ctx.db.dashboardMetric.findMany({
        where: {
          organizationId: ctx.workspace.organizationId,
          ...(input?.teamId && {
            metric: { teamId: input.teamId },
          }),
        },
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
          organizationId: ctx.workspace.organizationId,
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
