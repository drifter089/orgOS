/**
 * PostHog Total Events Sync
 *
 * Syncs all tracked events from PostHog with incremental updates.
 * Runs every hour to capture event data.
 */

import type { NangoSync } from './models';

export default async function fetchTotalEvents(nango: NangoSync) {
    try {
        // Get last sync timestamp for incremental updates
        const lastSyncState = await nango.getMetadata();
        const lastTimestamp = lastSyncState?.lastTimestamp as string | undefined;

        await nango.log(`Starting event sync. Last timestamp: ${lastTimestamp || 'none'}`);

        // Build params object
        const params: any = {
            orderBy: ['timestamp'],
            limit: 500
        };

        if (lastTimestamp) {
            params.after = lastTimestamp;
        }

        // Fetch events from PostHog with pagination
        const eventsGenerator = nango.paginate({
            endpoint: '/api/event/',
            params,
            paginate: {
                type: 'offset',
                offset_name_in_request: 'offset',
                limit: 500,
                response_path: 'results'
            }
        });

        // Collect all events from the async generator
        const events: any[] = [];
        for await (const batch of eventsGenerator) {
            events.push(...batch);
        }

        await nango.log(`Fetched ${events.length} events from PostHog`);

        if (events.length === 0) {
            await nango.log('No new events to sync');
            return;
        }

        // Transform events to ensure proper ID field
        const transformedEvents = events.map((event: any) => ({
            ...event,
            id: event.id || `${event.distinct_id}-${event.timestamp}` // Ensure unique ID
        }));

        // Save to Nango's cache
        await nango.batchSave(transformedEvents, 'PostHogEvent');

        // Update timestamp cursor for next incremental sync
        const latestTimestamp = events[events.length - 1]?.timestamp;
        if (latestTimestamp) {
            await nango.setMetadata({ lastTimestamp: latestTimestamp });
            await nango.log(`Updated cursor to timestamp: ${latestTimestamp}`);
        }

        await nango.log(`Successfully synced ${events.length} events`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync PostHog events: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
