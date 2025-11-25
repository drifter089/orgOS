import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getTemplate } from "@/app/metric/registry";
import { fetchData } from "@/server/api/services/nango";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

export const metricRouter = createTRPCRouter({
  // Fetch all metrics for a specific team
  getByTeam: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      // workspaceProcedure already ensures user belongs to org
      // Just fetch metrics for team within that org
      const metrics = await ctx.db.metric.findMany({
        where: {
          teamId: input.teamId,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
        include: {
          integration: true,
          team: true,
        },
        orderBy: { name: "asc" },
      });

      return metrics;
    }),

  getById: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
        include: {
          integration: true,
          team: true,
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // Simple check - metric's team must be in user's org
      if (metric.team.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      return metric;
    }),

  create: workspaceProcedure
    .input(
      z.object({
        teamId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        integrationId: z.string().optional(),
        metricTemplate: z.string().optional(),
        endpointConfig: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Simple check - team must exist and be in user's org
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

      return ctx.db.metric.create({
        data: {
          teamId: input.teamId,
          name: input.name,
          description: input.description,
          integrationId: input.integrationId,
          metricTemplate: input.metricTemplate,
          endpointConfig: input.endpointConfig,
        },
        include: {
          integration: true,
          team: true,
        },
      });
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
      // Simple check via query
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.id,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or access denied",
        });
      }

      return ctx.db.metric.update({
        where: { id: input.id },
        data: {
          name: input.name,
          description: input.description,
        },
        include: {
          integration: true,
          team: true,
        },
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check access and if metric is in use
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.id,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
        include: {
          roles: true,
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or access denied",
        });
      }

      if (metric.roles.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric: assigned to ${metric.roles.length} role(s)`,
        });
      }

      // dashboardMetrics will cascade delete automatically
      return ctx.db.metric.delete({
        where: { id: input.id },
      });
    }),

  fetchIntegrationData: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findFirst({
        where: {
          id: input.metricId,
          team: {
            organizationId: ctx.workspace.organizationId,
          },
        },
        include: {
          integration: true,
          team: true,
        },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or access denied",
        });
      }

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

      return {
        data: result.data,
        timestamp: new Date(),
      };
    }),

  // Fetch integration data during metric creation (before metric exists)
  fetchIntegrationOptions: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        endpoint: z.string(),
        method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
        params: z.record(z.string()).optional(),
        body: z.unknown().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await fetchData(
        input.integrationId,
        input.connectionId,
        input.endpoint,
        {
          method: input.method,
          params: input.params ?? {},
          body: input.body,
        },
      );

      return {
        data: result.data,
        timestamp: new Date(),
      };
    }),
});
