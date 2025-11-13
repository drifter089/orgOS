/**
 * Google Sheets Metadata Sync
 *
 * Syncs list of all Google Sheets in user's Drive.
 * This allows users to see and select sheets for metrics.
 */

import type { NangoSync } from './models';

export default async function fetchSheetsMetadata(nango: NangoSync) {
    try {
        await nango.log('Starting Google Sheets metadata sync');

        // Query Google Drive API for all spreadsheet files
        const response = await nango.get({
            endpoint: '/drive/v3/files',
            params: {
                q: "mimeType='application/vnd.google-apps.spreadsheet'",
                fields: 'files(id,name,webViewLink,modifiedTime)',
                pageSize: 100,
            },
        });

        const data = response.data as { files: any[] };
        const files = data.files || [];

        await nango.log(`Found ${files.length} Google Sheets`);

        if (files.length === 0) {
            await nango.log('No sheets found in Drive');
            return;
        }

        // Transform to our model
        const sheets = files.map((file: any) => ({
            id: file.id, // Use sheet ID as the unique identifier
            sheetId: file.id,
            sheetName: file.name || 'Untitled',
            url: file.webViewLink || '',
            lastModified: file.modifiedTime || new Date().toISOString(),
        }));

        // Save to Nango cache
        await nango.batchSave(sheets, 'GoogleSheetMetadata');
        await nango.log(`Successfully synced ${sheets.length} sheet metadata`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await nango.log(`Error in sheets metadata sync: ${errorMessage}`, { level: 'error' });
        throw new nango.ActionError({
            message: `Failed to sync Google Sheets metadata: ${errorMessage}`
        });
    }
}
