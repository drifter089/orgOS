/**
 * Metric Integration Router
 *
 * Handles integration-specific operations for metrics:
 * - Google Sheets structure/preview
 * - Dynamic options fetching (PostHog, GitHub)
 * - Service endpoint discovery and testing
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getServiceConfig, getSupportedServices } from "@/server/api/services";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";
import { fetchIntegrationData } from "@/server/api/utils/fetch-integration-data";

export const metricIntegrationRouter = createTRPCRouter({
  // ============================================================================
  // Google Sheets Operations
  // ============================================================================

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
        const response = await fetchIntegrationData({
          connectionId: input.connectionId,
          integrationId: "google-sheet",
          endpoint: `/v4/spreadsheets/${input.spreadsheetId}`,
          method: "GET",
        });

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
        const response = await fetchIntegrationData({
          connectionId: input.connectionId,
          integrationId: "google-sheet",
          endpoint: `/v4/spreadsheets/${input.spreadsheetId}/values/${input.sheetName}`,
          method: "GET",
        });

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

  // ============================================================================
  // Dynamic Options Fetching
  // ============================================================================

  fetchDynamicOptions: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        endpoint: z.string(), // e.g., "posthog-projects", "github-repos"
        dependsOnValue: z.string().optional(), // For cascading dropdowns
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
            const response = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "posthog",
              endpoint: "/api/projects",
              method: "GET",
            });

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

            const response = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "posthog",
              endpoint: `/api/projects/${input.dependsOnValue}/event_definitions`,
              method: "GET",
            });

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

            const response = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "posthog",
              endpoint: `/api/projects/${input.dependsOnValue}/insights`,
              method: "GET",
            });

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
            const repoResponse = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "github",
              endpoint: "/user/repos?per_page=100&sort=updated",
              method: "GET",
            });

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
            const orgResponse = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "github",
              endpoint: "/user/orgs",
              method: "GET",
            });

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

            const orgRepoResponse = await fetchIntegrationData({
              connectionId: input.connectionId,
              integrationId: "github",
              endpoint: `/orgs/${input.dependsOnValue}/repos?per_page=100&sort=updated`,
              method: "GET",
            });

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

  // ============================================================================
  // Service Endpoint Discovery & Testing
  // ============================================================================

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

        return await fetchIntegrationData({
          connectionId: input.connectionId,
          integrationId: input.integrationId,
          endpoint: input.endpoint,
          params: input.params,
          method: input.method,
          requestBody: testRequestBody,
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
              : "Failed to test integration endpoint",
        });
      }
    }),
});
