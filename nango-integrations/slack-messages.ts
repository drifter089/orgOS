/**
 * Slack Channel Messages Sync
 *
 * Syncs messages from configured Slack channels with incremental updates.
 * Requires per-connection configuration of channel_ids.
 * Runs every 30 minutes.
 */

import type { NangoSync } from './models';

export default async function fetchChannelMessages(nango: NangoSync) {
    try {
        // Get connection-specific configuration
        const connection = await nango.getConnection();
        const config = connection.connection_config;

        // Validate channel configuration
        const channelIds = config?.channel_ids as string[] | undefined;
        if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
            throw new nango.ActionError({
                message: 'channel_ids not configured. Please set connection_config.channel_ids as an array of channel IDs'
            });
        }

        await nango.log(`Syncing messages from ${channelIds.length} channels: ${channelIds.join(', ')}`);

        // Get last sync timestamp for incremental updates
        const lastSyncState = await nango.getMetadata();
        const channelTimestamps: Record<string, string> = (lastSyncState?.lastTimestamp as Record<string, string>) || {};

        const allMessages: any[] = [];

        // Fetch messages from each channel
        for (const channelId of channelIds) {
            const oldestTimestamp = channelTimestamps[channelId];

            await nango.log(`Fetching messages from channel ${channelId}${oldestTimestamp ? ` since ${oldestTimestamp}` : ''}`);

            // Build params object
            const params: any = {
                channel: channelId,
                limit: 100,
                inclusive: false
            };

            if (oldestTimestamp) {
                params.oldest = oldestTimestamp;
            }

            // Fetch messages with pagination
            const messagesGenerator = nango.paginate({
                endpoint: '/conversations.history',
                params,
                paginate: {
                    type: 'cursor',
                    cursor_path_in_response: 'response_metadata.next_cursor',
                    cursor_name_in_request: 'cursor',
                    limit: 100,
                    response_path: 'messages'
                }
            });

            // Collect all messages from the async generator
            const messages: any[] = [];
            for await (const batch of messagesGenerator) {
                messages.push(...batch);
            }

            // Add channel info to each message
            const messagesWithChannel = messages.map((msg: any) => ({
                ...msg,
                channel: channelId,
                id: msg.ts // Use timestamp as ID
            }));

            allMessages.push(...messagesWithChannel);

            // Update cursor for this channel
            if (messages.length > 0) {
                const latestTimestamp = messages[0]?.ts; // Messages are in reverse chronological order
                if (latestTimestamp) {
                    channelTimestamps[channelId] = latestTimestamp;
                }
            }

            await nango.log(`Fetched ${messages.length} messages from channel ${channelId}`);
        }

        if (allMessages.length === 0) {
            await nango.log('No new messages to sync');
            return;
        }

        // Save all messages to Nango's cache
        await nango.batchSave(allMessages, 'SlackMessage');

        // Update cursors for next incremental sync
        await nango.setMetadata({ lastTimestamp: channelTimestamps });

        await nango.log(`Successfully synced ${allMessages.length} total messages`);
    } catch (error) {
        throw new nango.ActionError({
            message: `Failed to sync Slack messages: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
    }
}
