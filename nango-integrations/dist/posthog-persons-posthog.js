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

// posthog-persons.ts
var posthog_persons_exports = {};
__export(posthog_persons_exports, {
  default: () => fetchPostHogPersons
});
module.exports = __toCommonJS(posthog_persons_exports);
async function fetchPostHogPersons(nango) {
  try {
    const lastSyncState = await nango.getMetadata();
    const lastCreatedAt = lastSyncState?.["lastCreatedAt"];
    await nango.log(`Starting persons sync. Last created_at: ${lastCreatedAt || "none"}`);
    const params = {
      order: "created_at",
      limit: 100
    };
    if (lastCreatedAt) {
      params.created_at__gte = lastCreatedAt;
    }
    const personsGenerator = nango.paginate({
      endpoint: "/api/persons/",
      params,
      paginate: {
        type: "cursor",
        cursor_path_in_response: "next",
        cursor_name_in_request: "offset",
        limit: 100,
        response_path: "results"
      }
    });
    const persons = [];
    for await (const batch of personsGenerator) {
      persons.push(...batch);
    }
    await nango.log(`Fetched ${persons.length} persons from PostHog`);
    if (persons.length === 0) {
      await nango.log("No new persons to sync");
      return;
    }
    await nango.batchSave(persons, "PostHogPerson");
    const latestCreatedAt = persons[persons.length - 1]?.created_at;
    if (latestCreatedAt) {
      await nango.setMetadata({ lastCreatedAt: latestCreatedAt });
      await nango.log(`Updated cursor to created_at: ${latestCreatedAt}`);
    }
    await nango.log(`Successfully synced ${persons.length} persons`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync PostHog persons: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
