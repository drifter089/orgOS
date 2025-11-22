/**
 * Google Sheets metric template definitions
 * Co-locates all Google Sheets-specific metric configurations
 */
import type { MetricTemplate } from "@/lib/metrics/types";

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
