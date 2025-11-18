/**
 * Core Metric Router
 *
 * Handles core metric operations:
 * - CRUD operations (create, read, update, delete)
 * - Template management
 * - Metric value refresh
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  getAllMetricTemplates,
  getMetricTemplate,
  getTemplatesByIntegration,
} from "@/server/api/services/metric-templates";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";
import {
  buildEndpointWithParams,
  fetchIntegrationData,
} from "@/server/api/utils/fetch-integration-data";
import {
  applyTransformation,
  extractValueFromPath,
} from "@/server/api/utils/metric-data";

export const metricRouter = createTRPCRouter({
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      orderBy: { name: "asc" },
    });
  }),

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
        orderBy: { name: "asc" },
      });
    }),

  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        type: z.enum(["percentage", "number", "duration", "rate"]),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.metric.create({
        data: {
          ...input,
          organizationId: ctx.workspace.organizationId,
        },
      });
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        currentValue: z.number().optional(),
        unit: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.metric.update({
        where: { id },
        data,
      });
    }),

  // Integration Metrics - Template Management
  getMetricTemplates: workspaceProcedure.query(() => {
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
        connectionId: z.string(), // Integration connectionId
        name: z.string().min(1).max(100).optional(), // Override template label
        description: z.string().optional(),
        targetValue: z.number().optional(),
        endpointParams: z.record(z.string()).optional(), // e.g., {VIDEO_ID: "abc123"}
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Get template definition
      const template = getMetricTemplate(input.templateId);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template not found: ${input.templateId}`,
        });
      }

      // Verify integration exists and user has access
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
      if (template.requiredParams && template.requiredParams.length > 0) {
        const missingParams = template.requiredParams
          .filter((p) => p.required)
          .filter((p) => !input.endpointParams?.[p.name]);

        if (missingParams.length > 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Missing required parameters: ${missingParams.map((p) => p.label).join(", ")}`,
          });
        }
      }

      // Create metric
      return ctx.db.metric.create({
        data: {
          name: input.name ?? template.label,
          description: input.description ?? template.description,
          type: template.metricType,
          targetValue: input.targetValue,
          unit: template.defaultUnit,
          organizationId: ctx.workspace.organizationId,
          integrationId: input.connectionId,
          metricTemplate: template.templateId,
          endpointConfig: input.endpointParams ?? {},
        },
      });
    }),

  // ============================================================================
  // Metric Value Operations
  // ============================================================================

  refreshMetricValue: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get metric
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

      // Check if this is an integration metric
      if (!metric.integrationId || !metric.metricTemplate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This metric is not integration-backed",
        });
      }

      // Get template
      const template = getMetricTemplate(metric.metricTemplate);
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Template not found: ${metric.metricTemplate}`,
        });
      }

      // Verify integration access
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

      // Prepare endpoint with parameters
      const params = (metric.endpointConfig as Record<string, string>) ?? {};
      const endpoint = buildEndpointWithParams(template.endpoint, params);

      // Fetch data from integration
      let result;
      try {
        result = await fetchIntegrationData({
          connectionId: metric.integrationId,
          integrationId: metric.integration.integrationId,
          endpoint,
          params,
          method: template.method ?? "GET",
          requestBodyTemplate: template.requestBodyTemplate,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch metric data",
        });
      }

      // Extract value using dataPath
      const value = extractValueFromPath(result.data, template.dataPath);

      // Special handling for extractColumn transformation (stores full column data)
      if (template.transformData === "extractColumn") {
        const columnIndex = parseInt(params.COLUMN_INDEX ?? "0");

        // Extract full column data (skip header row)
        const columnData: number[] = [];
        if (Array.isArray(value)) {
          // Skip row 0 (header), start from row 1
          for (let i = 1; i < value.length; i++) {
            const row = value[i];
            if (Array.isArray(row) && row[columnIndex] !== undefined) {
              const cellValue = parseFloat(String(row[columnIndex]));
              if (!isNaN(cellValue)) {
                columnData.push(cellValue);
              }
            }
          }
        }

        // Get latest value (last in array)
        const latestValue =
          columnData.length > 0 ? columnData[columnData.length - 1] : 0;

        // Update metric with full column data stored in endpointConfig
        const updatedConfig = {
          ...(metric.endpointConfig as Record<string, unknown>),
          columnData, // Store full array for visualization
          lastDataFetch: new Date().toISOString(),
        };

        return ctx.db.metric.update({
          where: { id: input.id },
          data: {
            currentValue: latestValue,
            lastFetchedAt: new Date(),
            endpointConfig: updatedConfig,
          },
        });
      }

      // Special handling for multi-column Google Sheets data
      if (template.transformData === "extractMultipleColumns") {
        const labelColumnIndex = params.LABEL_COLUMN_INDEX
          ? parseInt(params.LABEL_COLUMN_INDEX)
          : null;
        const dataColumnIndices = (params.DATA_COLUMN_INDICES ?? "0")
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n));

        // Get headers for column names
        const headers: string[] = [];
        const multiColumnData: Array<Record<string, string | number>> = [];

        if (Array.isArray(value) && value.length > 0) {
          // Extract headers from first row
          const headerRow = value[0] as string[];
          dataColumnIndices.forEach((colIndex) => {
            headers.push(headerRow[colIndex] ?? `Column ${colIndex}`);
          });

          // Extract data from rows (skip header)
          for (let i = 1; i < value.length; i++) {
            const row = value[i] as (string | number)[];
            const dataPoint: Record<string, string | number> = {};

            // Add label if specified
            if (
              labelColumnIndex !== null &&
              row[labelColumnIndex] !== undefined
            ) {
              dataPoint.label = String(row[labelColumnIndex]);
            } else {
              dataPoint.label = `Row ${i}`;
            }

            // Add each data column
            dataColumnIndices.forEach((colIndex, idx) => {
              const cellValue = row[colIndex];
              const numValue = parseFloat(String(cellValue));
              dataPoint[headers[idx] ?? `value${idx}`] = isNaN(numValue)
                ? 0
                : numValue;
            });

            multiColumnData.push(dataPoint);
          }
        }

        // Get latest value (first data column's last value)
        const latestValue =
          multiColumnData.length > 0 && headers.length > 0
            ? ((multiColumnData[multiColumnData.length - 1]![
                headers[0]!
              ] as number) ?? 0)
            : 0;

        // Store multi-column data in endpointConfig
        const updatedConfig = {
          ...(metric.endpointConfig as Record<string, unknown>),
          multiColumnData,
          headers,
          lastDataFetch: new Date().toISOString(),
        };

        return ctx.db.metric.update({
          where: { id: input.id },
          data: {
            currentValue: latestValue,
            lastFetchedAt: new Date(),
            endpointConfig: updatedConfig,
          },
        });
      }

      // Special handling for PostHog query results
      if (
        template.transformData &&
        [
          "extractHogQLResults",
          "extractTrendsResults",
          "extractEventsResults",
          "extractInsightResults",
        ].includes(template.transformData)
      ) {
        // Get count as the metric value
        const resultCount = Array.isArray(value) ? value.length : 0;

        // Only store params, no data - data will be fetched fresh for visualization
        return ctx.db.metric.update({
          where: { id: input.id },
          data: {
            currentValue: resultCount,
            lastFetchedAt: new Date(),
          },
        });
      }

      // Apply transformation if specified
      let finalValue: number;
      if (template.transformData) {
        finalValue = applyTransformation(value, template.transformData);
      } else {
        // Convert to number
        finalValue = parseFloat(String(value));
        if (isNaN(finalValue)) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to extract numeric value from path: ${template.dataPath}`,
          });
        }
      }

      // Update metric
      return ctx.db.metric.update({
        where: { id: input.id },
        data: {
          currentValue: finalValue,
          lastFetchedAt: new Date(),
        },
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
});
