/**
 * Google Sheets Metadata Sync
 *
 * Syncs spreadsheet metadata (title, sheet names, dimensions).
 * Requires per-connection configuration of spreadsheet_id.
 * Runs every hour.
 */

import type { NangoSync, SheetMetadata } from './models';

export default async function fetchSheetMetadata(nango: NangoSync) {
    try {
        // Get connection-specific configuration
        const connection = await nango.getConnection();
        const config = connection.connection_config;

        // Validate required configuration
        const spreadsheetId = config?.spreadsheet_id as string | undefined;
        if (!spreadsheetId) {
            throw new nango.ActionError({
                message: 'spreadsheet_id not configured for this connection. Please set connection_config.spreadsheet_id'
            });
        }

        await nango.log(`Fetching metadata for spreadsheet ${spreadsheetId}`);

        // Fetch spreadsheet metadata from Google Sheets API
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${spreadsheetId}`,
            params: {
                fields: 'spreadsheetId,properties,sheets.properties'
            }
        });

        const spreadsheet = response.data;

        // Transform to our model
        const metadata: SheetMetadata = {
            id: spreadsheetId,
            spreadsheet_id: spreadsheetId,
            title: spreadsheet.properties?.title || 'Untitled',
            sheets: spreadsheet.sheets?.map((sheet: any) => ({
                id: sheet.properties?.sheetId,
                title: sheet.properties?.title,
                index: sheet.properties?.index,
                rowCount: sheet.properties?.gridProperties?.rowCount,
                columnCount: sheet.properties?.gridProperties?.columnCount
            })) || []
        };

        // Save to Nango's cache
        await nango.batchSave([metadata], 'SheetMetadata');

        await nango.log(`Successfully synced metadata for spreadsheet ${spreadsheetId}`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync Google Sheets metadata: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
