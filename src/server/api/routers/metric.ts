import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  fetchData,
  getAllMetricTemplates,
  getAllServices,
  getMetricTemplate,
  getTemplatesByIntegration,
  renderEndpoints,
} from "@/server/api/services/base";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";
import {
  applyTransformation,
  extractValueFromPath,
} from "@/server/api/utils/metric-data";

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
  // Template Operations
  // ===========================================================================

  getAllTemplates: workspaceProcedure.query(() => {
    return getAllMetricTemplates();
  }),

  getTemplatesByIntegration: workspaceProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(({ input }) => {
      return getTemplatesByIntegration(input.integrationId);
    }),

  createFromTemplate: workspaceProcedure
    .input(
      z.object({
        templateId: z.string(),
        connectionId: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        endpointParams: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const template = getMetricTemplate(input.templateId);

      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.integrationId !== template.integrationId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Template ${input.templateId} requires ${template.integrationId} integration`,
        });
      }

      // Validate required parameters
      const missingParams = template.requiredParams
        .filter((p) => p.required)
        .filter((p) => !input.endpointParams?.[p.name]);

      if (missingParams.length > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Missing required parameters: ${missingParams.map((p) => p.label).join(", ")}`,
        });
      }

      return ctx.db.metric.create({
        data: {
          name: input.name ?? template.label,
          description: input.description ?? template.description,
          organizationId: ctx.workspace.organizationId,
          integrationId: input.connectionId,
          metricTemplate: template.templateId,
          endpointConfig: input.endpointParams ?? {},
        },
      });
    }),

  // ===========================================================================
  // Metric Refresh
  // ===========================================================================

  refreshMetricValue: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
        include: { integration: true },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      if (!metric.integrationId || !metric.metricTemplate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This metric is not integration-backed",
        });
      }

      const template = getMetricTemplate(metric.metricTemplate);

      if (!metric.integration) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Integration not found",
        });
      }

      await getIntegrationAndVerifyAccess(
        ctx.db,
        metric.integrationId,
        ctx.user.id,
        ctx.workspace,
      );

      const params = (metric.endpointConfig as Record<string, string>) ?? {};

      // Fetch data using new base function
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

      // Extract value
      const value = extractValueFromPath(result.data, template.dataPath);

      // Apply transformation if specified
      let finalValue: number;
      if (template.transform) {
        finalValue = applyTransformation(value, template.transform, params);
      } else {
        finalValue = parseFloat(String(value));
        if (isNaN(finalValue)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to extract numeric value from path: ${template.dataPath}`,
          });
        }
      }

      // Update lastFetchedAt and return the value
      const updatedMetric = await ctx.db.metric.update({
        where: { id: input.id },
        data: {
          lastFetchedAt: new Date(),
        },
      });

      return {
        ...updatedMetric,
        currentValue: finalValue, // Return the fetched value (not stored)
      };
    }),

  // ===========================================================================
  // Integration Operations
  // ===========================================================================

  // Get all services for API testing
  listServices: workspaceProcedure.query(() => {
    return getAllServices();
  }),

  // Get endpoints for a specific service
  getServiceEndpoints: workspaceProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(({ input }) => {
      return renderEndpoints(input.integrationId);
    }),

  // Test any integration endpoint
  testIntegrationEndpoint: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        integrationId: z.string(),
        endpoint: z.string(),
        method: z
          .enum(["GET", "POST", "PUT", "PATCH", "DELETE"])
          .default("GET"),
        params: z.record(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Integration is ${integration.status}. Please reconnect.`,
        });
      }

      // Special test query for PostHog Query API
      let testRequestBody = undefined;
      if (
        input.integrationId === "posthog" &&
        input.method === "POST" &&
        input.endpoint.includes("/query/")
      ) {
        testRequestBody = {
          query: {
            kind: "HogQLQuery",
            query:
              "SELECT event, count() as count FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count DESC LIMIT 10",
          },
        };
      }

      return await fetchData(
        input.integrationId,
        input.connectionId,
        input.endpoint,
        {
          method: input.method,
          params: input.params,
          body: testRequestBody,
        },
      );
    }),

  // Fetch dynamic options for dropdowns
  fetchDynamicOptions: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        templateId: z.string(),
        dropdownKey: z.string(),
        dependsOnValue: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      const template = getMetricTemplate(input.templateId);
      const dropdown = template.dropdowns?.find(
        (d) => d.paramName === input.dropdownKey,
      );

      if (!dropdown) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Dropdown not found: ${input.dropdownKey}`,
        });
      }

      // Build params for dependent dropdowns
      const params: Record<string, string> = {};
      if (dropdown.dependsOn && input.dependsOnValue) {
        params[dropdown.dependsOn] = input.dependsOnValue;
      }

      const result = await fetchData(
        template.integrationId,
        input.connectionId,
        dropdown.endpoint,
        {
          method: dropdown.method ?? "GET",
          params,
          body: dropdown.body,
        },
      );

      return dropdown.transform(result.data);
    }),

  // Google Sheets specific: Get sheet structure
  getSheetStructure: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        spreadsheetId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      const response = await fetchData(
        "google-sheet",
        input.connectionId,
        `/v4/spreadsheets/${input.spreadsheetId}`,
      );

      const responseData = response.data as {
        sheets?: Array<{
          properties: {
            title: string;
            gridProperties: {
              rowCount: number;
              columnCount: number;
            };
          };
        }>;
      };

      const sheets =
        responseData.sheets?.map((sheet) => ({
          title: sheet.properties.title,
          rowCount: sheet.properties.gridProperties.rowCount,
          columnCount: sheet.properties.gridProperties.columnCount,
        })) ?? [];

      return { sheets };
    }),

  // Google Sheets specific: Get sheet preview
  getSheetPreview: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        spreadsheetId: z.string(),
        sheetName: z.string(),
        maxRows: z.number().optional().default(10),
      }),
    )
    .query(async ({ ctx, input }) => {
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      const response = await fetchData(
        "google-sheet",
        input.connectionId,
        `/v4/spreadsheets/${input.spreadsheetId}/values/${input.sheetName}`,
      );

      const responseData = response.data as {
        values?: string[][];
      };

      const allRows = responseData.values ?? [];
      const headers = allRows.length > 0 ? allRows[0] : [];
      const dataRows = allRows.slice(1, input.maxRows + 1);

      return {
        headers: headers ?? [],
        rows: dataRows,
        totalRows: allRows.length - 1,
        totalColumns: (headers ?? []).length,
      };
    }),
});
