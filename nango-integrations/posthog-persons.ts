/**
 * PostHog Persons Sync
 *
 * Syncs active persons/users from PostHog with incremental updates.
 * Runs every 15 minutes.
 */

import type { NangoSync } from './models';

export default async function fetchPostHogPersons(nango: NangoSync) {
    try {
        // Get last sync timestamp for incremental updates
        const lastSyncState = await nango.getMetadata();
        const lastCreatedAt = lastSyncState?.lastCreatedAt as string | undefined;

        await nango.log(`Starting persons sync. Last created_at: ${lastCreatedAt || 'none'}`);

        // Build params object
        const params: any = {
            order: 'created_at',
            limit: 100
        };

        if (lastCreatedAt) {
            params.created_at__gte = lastCreatedAt;
        }

        // Fetch persons from PostHog with pagination
        const personsGenerator = nango.paginate({
            endpoint: '/api/persons/',
            params,
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'next',
                cursor_name_in_request: 'offset',
                limit: 100,
                response_path: 'results'
            }
        });

        // Collect all persons from the async generator
        const persons: any[] = [];
        for await (const batch of personsGenerator) {
            persons.push(...batch);
        }

        await nango.log(`Fetched ${persons.length} persons from PostHog`);

        if (persons.length === 0) {
            await nango.log('No new persons to sync');
            return;
        }

        // Save to Nango's cache
        await nango.batchSave(persons, 'PostHogPerson');

        // Update cursor for next incremental sync
        const latestCreatedAt = persons[persons.length - 1]?.created_at;
        if (latestCreatedAt) {
            await nango.setMetadata({ lastCreatedAt: latestCreatedAt });
            await nango.log(`Updated cursor to created_at: ${latestCreatedAt}`);
        }

        await nango.log(`Successfully synced ${persons.length} persons`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync PostHog persons: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
