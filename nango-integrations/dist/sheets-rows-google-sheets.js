"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// sheets-rows.ts
var sheets_rows_exports = {};
__export(sheets_rows_exports, {
  default: () => fetchSheetRows
});
module.exports = __toCommonJS(sheets_rows_exports);
async function fetchSheetRows(nango) {
  try {
    const connection = await nango.getConnection();
    const config = connection.connection_config;
    const spreadsheetId = config?.spreadsheet_id;
    if (!spreadsheetId) {
      throw new nango.ActionError({
        message: "spreadsheet_id not configured for this connection. Please set connection_config.spreadsheet_id"
      });
    }
    const range = config?.range || "Sheet1!A1:Z1000";
    const sheetName = range.split("!")[0] || "Sheet1";
    await nango.log(`Fetching rows from spreadsheet ${spreadsheetId}, range: ${range}`);
    const response = await nango.get({
      endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      params: {
        valueRenderOption: "UNFORMATTED_VALUE",
        dateTimeRenderOption: "SERIAL_NUMBER",
        majorDimension: "ROWS"
      }
    });
    const values = response.data.values || [];
    await nango.log(`Fetched ${values.length} rows from Google Sheets`);
    if (values.length === 0) {
      await nango.log("No rows found in the specified range");
      return;
    }
    const rows = values.map((rowValues, index) => ({
      id: `${spreadsheetId}-${sheetName}-row-${index}`,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
      row_number: index + 1,
      values: rowValues,
      last_updated: (/* @__PURE__ */ new Date()).toISOString()
    }));
    await nango.batchSave(rows, "SheetRow");
    await nango.log(`Successfully synced ${rows.length} rows from spreadsheet ${spreadsheetId}`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync Google Sheets rows: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
