/**
 * Slack Channels Sync
 *
 * Syncs all channels in the Slack workspace.
 * Full sync (replaces all data each time).
 * Runs every 2 hours.
 */

import type { NangoSync } from './models';

export default async function fetchChannels(nango: NangoSync) {
    try {
        await nango.log('Fetching all channels from Slack workspace');

        // Fetch all channels with pagination
        const channelsGenerator = nango.paginate({
            endpoint: '/conversations.list',
            params: {
                types: 'public_channel,private_channel',
                exclude_archived: 'false',
                limit: 200
            },
            paginate: {
                type: 'cursor',
                cursor_path_in_response: 'response_metadata.next_cursor',
                cursor_name_in_request: 'cursor',
                limit: 200,
                response_path: 'channels'
            }
        });

        // Collect all channels from the async generator
        const channels: any[] = [];
        for await (const batch of channelsGenerator) {
            channels.push(...batch);
        }

        await nango.log(`Fetched ${channels.length} channels from Slack`);

        if (channels.length === 0) {
            await nango.log('No channels found');
            return;
        }

        // Transform channels to ensure proper structure
        const transformedChannels = channels.map((channel: any) => ({
            id: channel.id,
            name: channel.name,
            is_channel: channel.is_channel || true,
            is_private: channel.is_private || false,
            is_archived: channel.is_archived || false,
            num_members: channel.num_members || 0
        }));

        // Save to Nango's cache (full sync - replaces all)
        await nango.batchSave(transformedChannels, 'SlackChannel');

        await nango.log(`Successfully synced ${transformedChannels.length} channels`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync Slack channels: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
