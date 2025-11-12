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

// slack-channels.ts
var slack_channels_exports = {};
__export(slack_channels_exports, {
  default: () => fetchChannels
});
module.exports = __toCommonJS(slack_channels_exports);
async function fetchChannels(nango) {
  try {
    await nango.log("Fetching all channels from Slack workspace");
    const channelsGenerator = nango.paginate({
      endpoint: "/conversations.list",
      params: {
        types: "public_channel,private_channel",
        exclude_archived: "false",
        limit: 200
      },
      paginate: {
        type: "cursor",
        cursor_path_in_response: "response_metadata.next_cursor",
        cursor_name_in_request: "cursor",
        limit: 200,
        response_path: "channels"
      }
    });
    const channels = [];
    for await (const batch of channelsGenerator) {
      channels.push(...batch);
    }
    await nango.log(`Fetched ${channels.length} channels from Slack`);
    if (channels.length === 0) {
      await nango.log("No channels found");
      return;
    }
    const transformedChannels = channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      is_channel: channel.is_channel || true,
      is_private: channel.is_private || false,
      is_archived: channel.is_archived || false,
      num_members: channel.num_members || 0
    }));
    await nango.batchSave(transformedChannels, "SlackChannel");
    await nango.log(`Successfully synced ${transformedChannels.length} channels`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync Slack channels: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
