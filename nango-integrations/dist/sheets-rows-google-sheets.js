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
    const metadata = await nango.getMetadata();
    const sheetIds = metadata?.sheet_ids || [];
    if (sheetIds.length === 0) {
      await nango.log("No sheets configured for sync. Add sheet_ids to connection metadata.");
      return;
    }
    await nango.log(`Starting sync for ${sheetIds.length} sheet(s)`);
    for (const sheetId of sheetIds) {
      await syncSheetData(nango, sheetId);
    }
    await nango.log("All sheets synced successfully");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await nango.log(`Error in sheets rows sync: ${errorMessage}`, { level: "error" });
    throw new nango.ActionError({
      message: `Failed to sync sheet rows: ${errorMessage}`
    });
  }
}
async function syncSheetData(nango, sheetId) {
  try {
    await nango.log(`Fetching data for sheet: ${sheetId}`);
    const response = await nango.get({
      endpoint: `/v4/spreadsheets/${sheetId}`,
      params: {
        includeGridData: "true",
        ranges: "A1:ZZ1000"
        // Fetch first 1000 rows, columns A-ZZ
      }
    });
    const data = response.data;
    const sheets = data.sheets || [];
    if (sheets.length === 0) {
      await nango.log(`No data found in sheet ${sheetId}`);
      return;
    }
    const firstSheet = sheets[0];
    const gridData = firstSheet?.data?.[0];
    const rowData = gridData?.rowData || [];
    await nango.log(`Found ${rowData.length} rows in sheet ${sheetId}`);
    const rows = rowData.map((row, index) => {
      const values = (row.values || []).map((cell) => {
        return cell.effectiveValue?.stringValue || cell.effectiveValue?.numberValue?.toString() || cell.effectiveValue?.boolValue?.toString() || "";
      });
      return {
        id: `${sheetId}-row-${index}`,
        sheetId,
        rowIndex: index + 1,
        // 1-indexed for user readability
        values
      };
    });
    if (rows.length > 0) {
      await nango.batchSave(rows, "GoogleSheetRow");
      await nango.log(`Synced ${rows.length} rows from sheet ${sheetId}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await nango.log(`Error syncing sheet ${sheetId}: ${errorMessage}`, { level: "error" });
  }
}
