/**
 * PostHog Events Sync
 *
 * Syncs recent events from ALL PostHog projects.
 * No project_id required - fetches from all accessible projects.
 */

import type { NangoSync } from './models';

export default async function fetchTotalEvents(nango: NangoSync) {
    try {
        await nango.log('Starting events sync for all PostHog projects');

        // First, get all accessible projects
        const projectsResponse = await nango.get({
            endpoint: '/api/projects/',
        });

        const projectsData = projectsResponse.data as { results: any[] };
        const projects = projectsData.results || [];

        await nango.log(`Found ${projects.length} accessible projects`);

        if (projects.length === 0) {
            await nango.log('No projects found');
            return;
        }

        let totalEvents = 0;

        // Fetch events from each project
        for (const project of projects) {
            const projectId = project.id;
            const projectName = project.name || `Project ${projectId}`;

            await nango.log(`Fetching events from project: ${projectName} (ID: ${projectId})`);

            try {
                const response = await nango.get({
                    endpoint: `/api/projects/${projectId}/events/`,
                    params: {
                        limit: 100
                    }
                });

                const data = response.data as { results: any[] };
                const events = data.results || [];

                if (events.length === 0) {
                    await nango.log(`No events found in project ${projectName}`);
                    continue;
                }

                // Transform and save events with project_id included
                const transformedEvents = events.map((event: any) => ({
                    id: `${projectId}-${event.id?.toString() || `${event.distinct_id}-${event.timestamp}`}`,
                    event: event.event || '',
                    distinct_id: event.distinct_id || '',
                    properties: {
                        ...event.properties,
                        _project_id: projectId.toString(),
                        _project_name: projectName,
                    },
                    timestamp: event.timestamp || new Date().toISOString()
                }));

                await nango.batchSave(transformedEvents, 'PostHogEvent');
                totalEvents += transformedEvents.length;
                await nango.log(`Synced ${transformedEvents.length} events from ${projectName}`);

            } catch (projectError) {
                const errorMessage = projectError instanceof Error ? projectError.message : String(projectError);
                await nango.log(`Error fetching events from ${projectName}: ${errorMessage}`, { level: 'error' });
                // Continue with other projects
            }
        }

        await nango.log(`Successfully synced ${totalEvents} total events from ${projects.length} projects`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await nango.log(`Error in events sync: ${errorMessage}`, { level: 'error' });
        throw new nango.ActionError({
            message: `Failed to sync PostHog events: ${errorMessage}`
        });
    }
}
