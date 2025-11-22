import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { fetchData } from "@/server/api/services/nango";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

export const metricRouter = createTRPCRouter({
  // ===========================================================================
  // CRUD Operations
  // ===========================================================================

  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
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

  create: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
        connectionId: z.string(),
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        endpointParams: z.record(z.string()),
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

      // No template validation here - trust frontend
      // Just save the configuration
      return ctx.db.metric.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: ctx.workspace.organizationId,
          integrationId: input.connectionId,
          metricTemplate: input.templateId,
          endpointConfig: input.endpointParams,
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
  // Generic Integration Data Fetching
  // ===========================================================================

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
