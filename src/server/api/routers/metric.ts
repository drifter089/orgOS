import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getServiceConfig, getSupportedServices } from "@/server/api/services";
import { fetchGitHubData } from "@/server/api/services/github";
import { fetchGoogleSheetsData } from "@/server/api/services/google-sheets";
import {
  getAllMetricTemplates,
  getMetricTemplate,
  getTemplatesByIntegration,
} from "@/server/api/services/metric-templates";
import { fetchPostHogData } from "@/server/api/services/posthog";
import { fetchYouTubeData } from "@/server/api/services/youtube";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

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

  // Google Sheets - Fetch Sheet Structure
  getSheetStructure: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        spreadsheetId: z.string(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify integration access
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      try {
        // Fetch spreadsheet metadata
        const response = await fetchGoogleSheetsData(
          input.connectionId,
          "/v4/spreadsheets/{SPREADSHEET_ID}",
          { SPREADSHEET_ID: input.spreadsheetId },
          "GET",
        );

        // Extract sheet titles and dimensions
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
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch sheet structure",
        });
      }
    }),

  getSheetPreview: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        spreadsheetId: z.string(),
        sheetName: z.string(),
        maxRows: z.number().optional().default(10), // Preview first 10 rows
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify integration access
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      try {
        // Fetch all non-empty data from the sheet
        // Using just the sheet name returns all non-empty rows/columns
        const response = await fetchGoogleSheetsData(
          input.connectionId,
          "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",
          {
            SPREADSHEET_ID: input.spreadsheetId,
            SHEET_NAME: input.sheetName,
          },
          "GET",
        );

        const responseData = response.data as {
          range?: string;
          majorDimension?: string;
          values?: string[][];
        };

        const allRows = responseData.values ?? [];
        const headers = allRows.length > 0 ? allRows[0] : [];
        const dataRows = allRows.slice(1, input.maxRows + 1); // Skip header, take maxRows

        return {
          headers: headers ?? [],
          rows: dataRows,
          totalRows: allRows.length - 1, // Exclude header
          totalColumns: (headers ?? []).length,
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch sheet preview",
        });
      }
    }),

  // Dynamic Parameter Options
  fetchDynamicOptions: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        endpoint: z.string(), // e.g., "posthog-projects" or "posthog-events"
        dependsOnValue: z.string().optional(), // For cascading selects (e.g., PROJECT_ID for events)
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify integration access
      await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      let result: Array<{ label: string; value: string }> = [];

      try {
        switch (input.endpoint) {
          case "posthog-projects": {
            // Fetch PostHog projects
            const response = await fetchPostHogData(
              input.connectionId,
              "/api/projects",
              undefined,
              "GET",
            );

            // Extract projects from response
            const responseData = response.data as {
              results?: Array<{ id: number; name: string }>;
            };
            const projects = responseData.results ?? [];
            result = projects.map((project) => ({
              label: project.name,
              value: project.id.toString(),
            }));
            break;
          }

          case "posthog-events": {
            // Fetch PostHog events for a specific project
            if (!input.dependsOnValue) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "PROJECT_ID is required to fetch events",
              });
            }

            const response = await fetchPostHogData(
              input.connectionId,
              `/api/projects/${input.dependsOnValue}/event_definitions`,
              undefined,
              "GET",
            );

            // Extract event names from response
            const responseData = response.data as {
              results?: Array<{ name: string }>;
            };
            const events = responseData.results ?? [];
            result = events.map((event) => ({
              label: event.name,
              value: event.name,
            }));
            break;
          }

          case "posthog-insights": {
            // Fetch PostHog saved insights for a specific project
            if (!input.dependsOnValue) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "PROJECT_ID is required to fetch insights",
              });
            }

            const response = await fetchPostHogData(
              input.connectionId,
              `/api/projects/${input.dependsOnValue}/insights`,
              undefined,
              "GET",
            );

            // Extract insights from response
            const responseData = response.data as {
              results?: Array<{
                id: number;
                name: string;
                description?: string;
              }>;
            };
            const insights = responseData.results ?? [];
            result = insights.map((insight) => ({
              label: insight.name || `Insight ${insight.id}`,
              value: insight.id.toString(),
            }));
            break;
          }

          case "github-repos": {
            const repoResponse = await fetchGitHubData(
              input.connectionId,
              "/user/repos?per_page=100&sort=updated",
            );

            const repos = repoResponse.data as Array<{
              full_name: string;
              name: string;
              owner: { login: string };
              private: boolean;
            }>;

            result = repos.map((repo) => ({
              label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
              value: repo.full_name,
            }));
            break;
          }

          case "github-orgs": {
            const orgResponse = await fetchGitHubData(
              input.connectionId,
              "/user/orgs",
            );

            const orgs = orgResponse.data as Array<{
              login: string;
              description?: string;
            }>;

            result = orgs.map((org) => ({
              label: org.login,
              value: org.login,
            }));
            break;
          }

          case "github-org-repos": {
            if (!input.dependsOnValue) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Organization name is required to fetch repos",
              });
            }

            const orgRepoResponse = await fetchGitHubData(
              input.connectionId,
              `/orgs/${input.dependsOnValue}/repos?per_page=100&sort=updated`,
            );

            const orgRepos = orgRepoResponse.data as Array<{
              full_name: string;
              name: string;
              private: boolean;
            }>;

            result = orgRepos.map((repo) => ({
              label: `${repo.name}${repo.private ? " (private)" : ""}`,
              value: repo.full_name,
            }));
            break;
          }

          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unknown dynamic endpoint: ${input.endpoint}`,
            });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch dynamic options",
        });
      }

      return result;
    }),

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
      let endpoint = template.endpoint;
      const params = (metric.endpointConfig as Record<string, string>) ?? {};

      // Replace path parameters
      Object.entries(params).forEach(([key, value]) => {
        endpoint = endpoint.replace(`{${key}}`, value);
      });

      // Fetch data from integration
      let result;
      try {
        switch (metric.integration.integrationId) {
          case "github":
            result = await fetchGitHubData(
              metric.integrationId,
              endpoint,
              template.method ?? "GET",
            );
            break;
          case "google-sheet":
            result = await fetchGoogleSheetsData(
              metric.integrationId,
              endpoint,
              params,
              template.method ?? "GET",
            );
            break;
          case "posthog": {
            // Build request body if template has a body template
            let requestBody: unknown = undefined;
            if (template.requestBodyTemplate && template.method === "POST") {
              let bodyString = template.requestBodyTemplate;
              // Replace parameter placeholders in body
              Object.entries(params).forEach(([key, value]) => {
                bodyString = bodyString.replace(
                  new RegExp(`\\{${key}\\}`, "g"),
                  value,
                );
              });
              try {
                requestBody = JSON.parse(bodyString);
              } catch {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: "Failed to parse request body template",
                });
              }
            }

            result = await fetchPostHogData(
              metric.integrationId,
              endpoint,
              params,
              template.method ?? "GET",
              requestBody,
            );
            break;
          }
          case "youtube":
            result = await fetchYouTubeData(
              metric.integrationId,
              endpoint,
              params,
              template.method ?? "GET",
            );
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unsupported integration: ${metric.integration.integrationId}`,
            });
        }
      } catch (error) {
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

  // Integration endpoint testing procedures
  listSupportedServices: workspaceProcedure.query(() => {
    const services = getSupportedServices();
    return services.map((serviceId) => {
      const config = getServiceConfig(serviceId);
      return {
        id: serviceId,
        name: config?.name ?? serviceId,
        endpointCount: config?.endpoints.length ?? 0,
      };
    });
  }),

  getServiceEndpoints: workspaceProcedure
    .input(z.object({ integrationId: z.string() }))
    .query(({ input }) => {
      const config = getServiceConfig(input.integrationId);

      if (!config) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Service configuration not found for ${input.integrationId}`,
        });
      }

      return {
        name: config.name,
        integrationId: config.integrationId,
        endpoints: config.endpoints,
        exampleParams:
          "exampleParams" in config ? config.exampleParams : undefined,
      };
    }),

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
      // Verify user has access to this integration
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

      // Route to appropriate service based on integration ID
      try {
        let result;
        switch (input.integrationId) {
          case "github":
            result = await fetchGitHubData(
              input.connectionId,
              input.endpoint,
              input.method,
            );
            break;
          case "google-sheet": // Match Nango integration ID
            result = await fetchGoogleSheetsData(
              input.connectionId,
              input.endpoint,
              input.params,
              input.method,
            );
            break;
          case "posthog":
            // For Query API POST requests, provide example body based on endpoint label
            let postBody = undefined;
            if (input.method === "POST" && input.endpoint.includes("/query/")) {
              // Simple HogQL query example for testing
              postBody = {
                query: {
                  kind: "HogQLQuery",
                  query:
                    "SELECT event, count() as count FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count DESC LIMIT 10",
                },
              };
            }

            result = await fetchPostHogData(
              input.connectionId,
              input.endpoint,
              input.params,
              input.method,
              postBody,
            );
            break;
          case "youtube":
            // Auto-routes to Data or Analytics API based on endpoint
            result = await fetchYouTubeData(
              input.connectionId,
              input.endpoint,
              input.params,
              input.method,
            );
            break;
          default:
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Unsupported integration type: ${input.integrationId}`,
            });
        }

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to test integration endpoint",
        });
      }
    }),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract a value from a nested object using a dot-notation path
 * @param data The object to extract from
 * @param path Dot-notation path (e.g., "items.0.statistics.viewCount")
 * @returns The extracted value or undefined
 */
function extractValueFromPath(data: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = data;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[key];
    } else if (Array.isArray(current)) {
      const index = parseInt(key, 10);
      if (!isNaN(index)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Apply transformation to extracted data
 * @param value The extracted value
 * @param transformType The transformation type
 * @returns The transformed numeric value
 */
function applyTransformation(value: unknown, transformType: string): number {
  switch (transformType) {
    case "countRows":
      // Count number of rows in a Google Sheets response
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    case "countEvents":
      // Count number of events in PostHog response
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    case "extractHogQLResults":
    case "extractTrendsResults":
    case "extractEventsResults":
    case "extractInsightResults":
      // For PostHog query results, return row count as the metric value
      // Full data is stored in endpointConfig for visualization
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    default:
      // Default: convert to number
      const numValue = parseFloat(String(value));
      return isNaN(numValue) ? 0 : numValue;
  }
}
