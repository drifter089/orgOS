/**
 * Google Sheets Integration Registry
 * Single source of truth for all Google Sheets-related configurations
 */
import type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

// =============================================================================
// Metadata
// =============================================================================

export const name = "Google Sheets";
export const integrationId = "google-sheet";
export const baseUrl = "https://sheets.googleapis.com";

// =============================================================================
// Metric Templates
// =============================================================================

export const templates: MetricTemplate[] = [
  {
    templateId: "gsheets-cell-value",
    label: "Spreadsheet Cell Value",
    description: "Read a numeric value from a specific cell",
    integrationId: "google-sheet",
    metricType: "number",

    metricEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}",

    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description: "The ID from the spreadsheet URL",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "RANGE",
        label: "Cell Range",
        description: "A1 notation (e.g., Sheet1!A1)",
        type: "text",
        required: true,
        placeholder: "Sheet1!A1",
      },
    ],
  },

  {
    templateId: "gsheets-column-data",
    label: "Column Data (Full Dataset)",
    description: "Track all values in a column for visualization",
    integrationId: "google-sheet",
    metricType: "number",

    previewEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",
    metricEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",

    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description: "From the spreadsheet URL",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "SHEET_NAME",
        label: "Sheet Name",
        description: "Select sheet",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a sheet",
        dynamicConfig: {
          endpoint: "/v4/spreadsheets/{SPREADSHEET_ID}",
          method: "GET",
          dependsOn: "SPREADSHEET_ID",
        },
      },
      {
        name: "COLUMN_INDEX",
        label: "Column Index",
        description: "Column index (0-based)",
        type: "number",
        required: true,
        placeholder: "0",
      },
    ],
  },
];

// =============================================================================
// API Endpoints (for testing/debugging)
// =============================================================================

export const endpoints: Endpoint[] = [
  {
    label: "Get Spreadsheet Metadata",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}",
    method: "GET",
    description: "Get spreadsheet metadata and all sheets",
    requiresParams: true,
    params: ["SPREADSHEET_ID"],
  },
  {
    label: "Get Range Values",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}",
    method: "GET",
    description: "Get values from a specific range (e.g., Sheet1!A1:B10)",
    requiresParams: true,
    params: ["SPREADSHEET_ID", "RANGE"],
  },
  {
    label: "Get Sheet Values",
    path: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",
    method: "GET",
    description: "Get all non-empty values from a sheet",
    requiresParams: true,
    params: ["SPREADSHEET_ID", "SHEET_NAME"],
  },
];

export const exampleParams = {
  SPREADSHEET_ID: "13YZftK9xZ09t2oSvhwjE0Zb7P25nl9OaUAxIBVNH0js",
  RANGE: "Sheet1!A1:B10",
  SHEET_NAME: "Sheet1",
};

// =============================================================================
// Service Config (for api-test)
// =============================================================================

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
