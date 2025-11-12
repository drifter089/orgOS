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

// sheets-metadata.ts
var sheets_metadata_exports = {};
__export(sheets_metadata_exports, {
  default: () => fetchSheetMetadata
});
module.exports = __toCommonJS(sheets_metadata_exports);
async function fetchSheetMetadata(nango) {
  try {
    const connection = await nango.getConnection();
    const config = connection.connection_config;
    const spreadsheetId = config?.spreadsheet_id;
    if (!spreadsheetId) {
      throw new nango.ActionError({
        message: "spreadsheet_id not configured for this connection. Please set connection_config.spreadsheet_id"
      });
    }
    await nango.log(`Fetching metadata for spreadsheet ${spreadsheetId}`);
    const response = await nango.get({
      endpoint: `/v4/spreadsheets/${spreadsheetId}`,
      params: {
        fields: "spreadsheetId,properties,sheets.properties"
      }
    });
    const spreadsheet = response.data;
    const metadata = {
      id: spreadsheetId,
      spreadsheet_id: spreadsheetId,
      title: spreadsheet.properties?.title || "Untitled",
      sheets: spreadsheet.sheets?.map((sheet) => ({
        id: sheet.properties?.sheetId,
        title: sheet.properties?.title,
        index: sheet.properties?.index,
        rowCount: sheet.properties?.gridProperties?.rowCount,
        columnCount: sheet.properties?.gridProperties?.columnCount
      })) || []
    };
    await nango.batchSave([metadata], "SheetMetadata");
    await nango.log(`Successfully synced metadata for spreadsheet ${spreadsheetId}`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync Google Sheets metadata: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
