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

// slack-users.ts
var slack_users_exports = {};
__export(slack_users_exports, {
  default: () => fetchActiveUsers
});
module.exports = __toCommonJS(slack_users_exports);
async function fetchActiveUsers(nango) {
  try {
    await nango.log("Fetching all users from Slack workspace");
    const usersGenerator = nango.paginate({
      endpoint: "/users.list",
      params: {
        limit: 200,
        include_locale: "false"
      },
      paginate: {
        type: "cursor",
        cursor_path_in_response: "response_metadata.next_cursor",
        cursor_name_in_request: "cursor",
        limit: 200,
        response_path: "members"
      }
    });
    const users = [];
    for await (const batch of usersGenerator) {
      users.push(...batch);
    }
    await nango.log(`Fetched ${users.length} users from Slack`);
    if (users.length === 0) {
      await nango.log("No users found");
      return;
    }
    const activeUsers = users.filter((user) => {
      return !user.deleted && !user.is_bot;
    });
    await nango.log(`Filtered to ${activeUsers.length} active, non-bot users`);
    const transformedUsers = activeUsers.map((user) => ({
      id: user.id,
      name: user.name,
      real_name: user.real_name || user.name,
      display_name: user.profile?.display_name || user.real_name || user.name,
      email: user.profile?.email,
      is_active: !user.deleted && user.is_active !== false,
      is_bot: user.is_bot || false,
      is_admin: user.is_admin || false,
      is_owner: user.is_owner || false,
      updated: user.updated || Math.floor(Date.now() / 1e3),
      profile: {
        avatar_hash: user.profile?.avatar_hash,
        status_text: user.profile?.status_text,
        status_emoji: user.profile?.status_emoji
      }
    }));
    await nango.batchSave(transformedUsers, "SlackUser");
    await nango.log(`Successfully synced ${transformedUsers.length} active users`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync Slack users: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
