/**
 * Slack Active Users Sync
 *
 * Syncs all users in the Slack workspace.
 * Full sync (replaces all data each time).
 * Runs every hour.
 */

import type { NangoSync } from './models';

export default async function fetchActiveUsers(nango: NangoSync) {
    try {
        await nango.log('Fetching all users from Slack workspace');

        // Fetch all users with pagination
        const usersGenerator = nango.paginate({
            endpoint: '/users.list',
            params: {
                limit: 200,
                include_locale: 'false'
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                cursor_name_in_request: 'cursor',
                limit: 200,
                response_path: 'members'
            }
        });

        // Collect all users from the async generator
        const users: any[] = [];
        for await (const batch of usersGenerator) {
            users.push(...batch);
        }

        await nango.log(`Fetched ${users.length} users from Slack`);

        if (users.length === 0) {
            await nango.log('No users found');
            return;
        }

        // Filter out deleted users and bots (optional)
        const activeUsers = users.filter((user: any) => {
            // Keep real users who are not deleted
            return !user.deleted && !user.is_bot;
        });

        await nango.log(`Filtered to ${activeUsers.length} active, non-bot users`);

        // Transform users to ensure proper structure
        const transformedUsers = activeUsers.map((user: any) => ({
            id: user.id,
            name: user.name,
            real_name: user.real_name || user.name,
            display_name: user.profile?.display_name || user.real_name || user.name,
            email: user.profile?.email,
            is_active: !user.deleted && user.is_active !== false,
            is_bot: user.is_bot || false,
            is_admin: user.is_admin || false,
            is_owner: user.is_owner || false,
            updated: user.updated || Math.floor(Date.now() / 1000),
            profile: {
                avatar_hash: user.profile?.avatar_hash,
                status_text: user.profile?.status_text,
                status_emoji: user.profile?.status_emoji
            }
        }));

        // Save to Nango's cache (full sync - replaces all)
        await nango.batchSave(transformedUsers, 'SlackUser');

        await nango.log(`Successfully synced ${transformedUsers.length} active users`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync Slack users: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
