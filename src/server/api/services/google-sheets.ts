/**
 * Google Sheets API Endpoint Definitions
 * Base URL handled by Nango proxy
 * Requires Spreadsheet ID as parameter
 */
/**
 * Fetch data from Google Sheets API using Nango proxy
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

import type { ServiceEndpoint } from "./github";

export const googleSheetsEndpoints: ServiceEndpoint[] = [
  {
    label: "Get Spreadsheet",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}",
    method: "GET",
    description: "Get spreadsheet metadata and all sheets",
    requiresParams: true,
    params: ["SPREADSHEET_ID"],
  },
  {
    label: "Get Sheet Properties",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}?fields=sheets.properties",
    method: "GET",
    description: "Get only sheet properties (names, IDs, etc.)",
    requiresParams: true,
    params: ["SPREADSHEET_ID"],
  },
  {
    label: "Get Range Values",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}/values/Sheet1!A1:B10",
    method: "GET",
    description: "Get values from a specific range (example: Sheet1!A1:B10)",
    requiresParams: true,
    params: ["SPREADSHEET_ID"],
  },
];

export const googleSheetsServiceConfig = {
  name: "Google Sheets",
  integrationId: "google-sheet", // Match Nango integration ID
  endpoints: googleSheetsEndpoints,
  baseUrl: "https://sheets.googleapis.com",
  exampleParams: {
    SPREADSHEET_ID: "13YZftK9xZ09t2oSvhwjE0Zb7P25nl9OaUAxIBVNH0js",
  },
};

export async function fetchGoogleSheetsData(
  connectionId: string,
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  // Replace parameter placeholders with actual values
  let finalEndpoint = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
    });
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: "google-sheet", // Match Nango provider config key
      endpoint: finalEndpoint,
      method,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[Google Sheets API Fetch]", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from Google Sheets",
    });
  }
}
