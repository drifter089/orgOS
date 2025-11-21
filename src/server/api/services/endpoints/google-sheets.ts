import type { Endpoint, ServiceConfig } from "../base";

export const name = "Google Sheets";
export const integrationId = "google-sheet";
export const baseUrl = "https://sheets.googleapis.com";

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

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
