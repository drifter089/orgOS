"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// slack-messages.ts
var slack_messages_exports = {};
__export(slack_messages_exports, {
  default: () => fetchChannelMessages
});
module.exports = __toCommonJS(slack_messages_exports);
async function fetchChannelMessages(nango) {
  try {
    const connection = await nango.getConnection();
    const config = connection.connection_config;
    const channelIds = config?.channel_ids;
    if (!channelIds || !Array.isArray(channelIds) || channelIds.length === 0) {
      throw new nango.ActionError({
        message: "channel_ids not configured. Please set connection_config.channel_ids as an array of channel IDs"
      });
    }
    await nango.log(`Syncing messages from ${channelIds.length} channels: ${channelIds.join(", ")}`);
    const lastSyncState = await nango.getMetadata();
    const channelTimestamps = lastSyncState?.["lastTimestamp"] || {};
    const allMessages = [];
    for (const channelId of channelIds) {
      const oldestTimestamp = channelTimestamps[channelId];
      await nango.log(`Fetching messages from channel ${channelId}${oldestTimestamp ? ` since ${oldestTimestamp}` : ""}`);
      const params = {
        channel: channelId,
        limit: 100,
        inclusive: false
      };
      if (oldestTimestamp) {
        params.oldest = oldestTimestamp;
      }
      const messagesGenerator = nango.paginate({
        endpoint: "/conversations.history",
        params,
        paginate: {
          type: "cursor",
          cursor_path_in_response: "response_metadata.next_cursor",
          cursor_name_in_request: "cursor",
          limit: 100,
          response_path: "messages"
        }
      });
      const messages = [];
      for await (const batch of messagesGenerator) {
        messages.push(...batch);
      }
      const messagesWithChannel = messages.map((msg) => ({
        ...msg,
        channel: channelId,
        id: msg.ts
        // Use timestamp as ID
      }));
      allMessages.push(...messagesWithChannel);
      if (messages.length > 0) {
        const latestTimestamp = messages[0]?.ts;
        if (latestTimestamp) {
          channelTimestamps[channelId] = latestTimestamp;
        }
      }
      await nango.log(`Fetched ${messages.length} messages from channel ${channelId}`);
    }
    if (allMessages.length === 0) {
      await nango.log("No new messages to sync");
      return;
    }
    await nango.batchSave(allMessages, "SlackMessage");
    await nango.setMetadata({ lastTimestamp: channelTimestamps });
    await nango.log(`Successfully synced ${allMessages.length} total messages`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync Slack messages: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
