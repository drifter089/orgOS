/**
 * Google Sheets Rows Sync
 *
 * Syncs row data from user-selected sheets.
 * This sync is triggered manually when a user creates a metric from a sheet.
 *
 * To configure which sheets to sync, set connection metadata:
 * { sheet_ids: ["sheet_id_1", "sheet_id_2"] }
 */

import type { NangoSync } from './models';

export default async function fetchSheetRows(nango: NangoSync) {
    try {
        // Get list of sheet IDs to sync from connection metadata
        const metadata = await nango.getMetadata();
        const sheetIds = (metadata as any)?.sheet_ids || [];

        if (sheetIds.length === 0) {
            await nango.log('No sheets configured for sync. Add sheet_ids to connection metadata.');
            return;
        }

        await nango.log(`Starting sync for ${sheetIds.length} sheet(s)`);

        // Sync each configured sheet
        for (const sheetId of sheetIds) {
            await syncSheetData(nango, sheetId);
        }

        await nango.log('All sheets synced successfully');

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await nango.log(`Error in sheets rows sync: ${errorMessage}`, { level: 'error' });
        throw new nango.ActionError({
            message: `Failed to sync sheet rows: ${errorMessage}`
        });
    }
}

async function syncSheetData(nango: NangoSync, sheetId: string) {
    try {
        await nango.log(`Fetching data for sheet: ${sheetId}`);

        // Get sheet data from Google Sheets API
        const response = await nango.get({
            endpoint: `/v4/spreadsheets/${sheetId}`,
            params: {
                includeGridData: 'true',
                ranges: 'A1:ZZ1000', // Fetch first 1000 rows, columns A-ZZ
            },
        });

        const data = response.data as any;
        const sheets = data.sheets || [];

        if (sheets.length === 0) {
            await nango.log(`No data found in sheet ${sheetId}`);
            return;
        }

        // Process first sheet (tab) in the spreadsheet
        const firstSheet = sheets[0];
        const gridData = firstSheet?.data?.[0];
        const rowData = gridData?.rowData || [];

        await nango.log(`Found ${rowData.length} rows in sheet ${sheetId}`);

        // Transform rows to our model
        const rows = rowData.map((row: any, index: number) => {
            // Extract cell values
            const values = (row.values || []).map((cell: any) => {
                return cell.effectiveValue?.stringValue ||
                       cell.effectiveValue?.numberValue?.toString() ||
                       cell.effectiveValue?.boolValue?.toString() ||
                       '';
            });

            return {
                id: `${sheetId}-row-${index}`,
                sheetId: sheetId,
                rowIndex: index + 1, // 1-indexed for user readability
                values: values,
            };
        });

        // Save to Nango cache
        if (rows.length > 0) {
            await nango.batchSave(rows, 'GoogleSheetRow');
            await nango.log(`Synced ${rows.length} rows from sheet ${sheetId}`);
        }

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await nango.log(`Error syncing sheet ${sheetId}: ${errorMessage}`, { level: 'error' });
        // Don't throw - continue with other sheets
    }
}
