/**
 * PostHog Persons Sync
 *
 * Syncs all active users from ALL PostHog projects.
 * No project_id required - fetches from all accessible projects.
 */

import type { NangoSync } from './models';

export default async function fetchPostHogPersons(nango: NangoSync) {
    try {
        await nango.log('Starting persons sync for all PostHog projects');

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

        let totalPersons = 0;

        // Fetch persons from each project
        for (const project of projects) {
            const projectId = project.id;
            const projectName = project.name || `Project ${projectId}`;

            await nango.log(`Fetching persons from project: ${projectName} (ID: ${projectId})`);

            try {
                const response = await nango.get({
                    endpoint: `/api/projects/${projectId}/persons/`,
                    params: {
                        limit: 100
                    }
                });

                const data = response.data as { results: any[] };
                const persons = data.results || [];

                if (persons.length === 0) {
                    await nango.log(`No persons found in project ${projectName}`);
                    continue;
                }

                // Transform and save persons with project_id included
                const transformedPersons = persons.map((person: any) => ({
                    id: `${projectId}-${person.id?.toString() || person.distinct_id || `person-${Date.now()}`}`,
                    distinct_ids: person.distinct_ids || [],
                    properties: {
                        ...person.properties,
                        _project_id: projectId.toString(),
                        _project_name: projectName,
                    },
                    created_at: person.created_at || new Date().toISOString(),
                    is_identified: person.is_identified || false
                }));

                await nango.batchSave(transformedPersons, 'PostHogPerson');
                totalPersons += transformedPersons.length;
                await nango.log(`Synced ${transformedPersons.length} persons from ${projectName}`);

            } catch (projectError) {
                const errorMessage = projectError instanceof Error ? projectError.message : String(projectError);
                await nango.log(`Error fetching persons from ${projectName}: ${errorMessage}`, { level: 'error' });
                // Continue with other projects
            }
        }

        await nango.log(`Successfully synced ${totalPersons} total persons from ${projects.length} projects`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await nango.log(`Error in persons sync: ${errorMessage}`, { level: 'error' });
        throw new nango.ActionError({
            message: `Failed to sync PostHog persons: ${errorMessage}`
        });
    }
}
