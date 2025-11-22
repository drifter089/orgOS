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
// Data Transformations
// =============================================================================

/**
 * Transform Google Sheets metadata to extract sheet names for dropdown
 */
export function transformSheets(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    sheets?: Array<{ properties: { title: string } }>;
  };

  return (
    response.sheets?.map((s) => ({
      label: s.properties.title,
      value: s.properties.title,
    })) ?? []
  );
}

/**
 * Transform Google Sheets range values to extract a single cell value
 */
export function transformCellValue(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  if (!Array.isArray(response.values) || response.values.length === 0) {
    return 0;
  }

  const cellValue = response.values[0]?.[0];

  if (typeof cellValue === "number") return cellValue;
  if (typeof cellValue === "string") {
    const parsed = parseFloat(cellValue);
    return isNaN(parsed) ? 0 : parsed;
  }

  return 0;
}

/**
 * Transform Google Sheets range values to extract column data
 */
export function transformColumnData(data: unknown, columnIndex = 0): number[] {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  if (!Array.isArray(response.values)) return [];

  return response.values
    .map((row) => {
      const cellValue = row[columnIndex];
      if (typeof cellValue === "number") return cellValue;
      if (typeof cellValue === "string") {
        const parsed = parseFloat(cellValue);
        return isNaN(parsed) ? 0 : parsed;
      }
      return 0;
    })
    .filter((value) => value !== 0);
}

/**
 * Transform Google Sheets data for preview display
 * Returns raw 2D array for table rendering
 */
export function transformSheetPreview(
  data: unknown,
): Array<Array<string | number>> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    values?: Array<Array<string | number>>;
  };

  return response.values ?? [];
}

/**
 * Registry of all Google Sheets transformation functions
 */
export const transforms = {
  sheets: transformSheets,
  cellValue: transformCellValue,
  columnData: transformColumnData,
  sheetPreview: transformSheetPreview,
};

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
