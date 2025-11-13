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
  default: () => fetchSheetsMetadata
});
module.exports = __toCommonJS(sheets_metadata_exports);
async function fetchSheetsMetadata(nango) {
  try {
    await nango.log("Starting Google Sheets metadata sync");
    const response = await nango.get({
      endpoint: "/drive/v3/files",
      params: {
        q: "mimeType='application/vnd.google-apps.spreadsheet'",
        fields: "files(id,name,webViewLink,modifiedTime)",
        pageSize: 100
      }
    });
    const data = response.data;
    const files = data.files || [];
    await nango.log(`Found ${files.length} Google Sheets`);
    if (files.length === 0) {
      await nango.log("No sheets found in Drive");
      return;
    }
    const sheets = files.map((file) => ({
      id: file.id,
      // Use sheet ID as the unique identifier
      sheetId: file.id,
      sheetName: file.name || "Untitled",
      url: file.webViewLink || "",
      lastModified: file.modifiedTime || (/* @__PURE__ */ new Date()).toISOString()
    }));
    await nango.batchSave(sheets, "GoogleSheetMetadata");
    await nango.log(`Successfully synced ${sheets.length} sheet metadata`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await nango.log(`Error in sheets metadata sync: ${errorMessage}`, { level: "error" });
    throw new nango.ActionError({
      message: `Failed to sync Google Sheets metadata: ${errorMessage}`
    });
  }
}
