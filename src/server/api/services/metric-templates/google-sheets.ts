import type { MetricTemplate } from "../base";

export const templates: MetricTemplate[] = [
  {
    templateId: "gsheets-cell-value",
    label: "Spreadsheet Cell Value",
    description: "Read a numeric value from a specific cell",
    integrationId: "google-sheet",
    metricType: "number",

    metricEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{RANGE}",
    dataPath: "values.0.0",

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

    dropdowns: [
      {
        paramName: "SHEET_NAME",
        endpoint: "/v4/spreadsheets/{SPREADSHEET_ID}",
        transform: (data: unknown) =>
          (
            data as { sheets?: Array<{ properties: { title: string } }> }
          ).sheets?.map((s) => ({
            label: s.properties.title,
            value: s.properties.title,
          })) ?? [],
      },
    ],

    previewEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",
    metricEndpoint: "/v4/spreadsheets/{SPREADSHEET_ID}/values/{SHEET_NAME}",
    dataPath: "values",
    transform: "extractColumn",

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
        dynamicOptionsKey: "SHEET_NAME",
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
