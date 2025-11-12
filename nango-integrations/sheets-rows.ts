/**
 * Google Sheets Row Sync
 *
 * Syncs rows from a configured Google Sheets spreadsheet.
 * Requires per-connection configuration of spreadsheet_id and range.
 * Runs every 5 minutes.
 */

import type { NangoSync, SheetRow } from './models';

export default async function fetchSheetRows(nango: NangoSync) {
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

        // Get range (default to Sheet1 with large range if not specified)
        const range = (config?.range as string) || 'Sheet1!A1:Z1000';
        const sheetName = range.split('!')[0] || 'Sheet1';

        await nango.log(`Fetching rows from spreadsheet ${spreadsheetId}, range: ${range}`);

        // Fetch spreadsheet data from Google Sheets API
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
            params: {
                valueRenderOption: 'UNFORMATTED_VALUE',
                dateTimeRenderOption: 'SERIAL_NUMBER',
                majorDimension: 'ROWS'
            }
        });

        const values = response.data.values as any[][] || [];
        await nango.log(`Fetched ${values.length} rows from Google Sheets`);

        if (values.length === 0) {
            await nango.log('No rows found in the specified range');
            return;
        }

        // Transform rows to our model
        const rows: SheetRow[] = values.map((rowValues, index) => ({
            id: `${spreadsheetId}-${sheetName}-row-${index}`,
            spreadsheet_id: spreadsheetId,
            sheet_name: sheetName,
            row_number: index + 1,
            values: rowValues,
            last_updated: new Date().toISOString()
        }));

        // Save to Nango's cache (full sync - replaces all existing data)
        await nango.batchSave(rows, 'SheetRow');

        await nango.log(`Successfully synced ${rows.length} rows from spreadsheet ${spreadsheetId}`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync Google Sheets rows: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
