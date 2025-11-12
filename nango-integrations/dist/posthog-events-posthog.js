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

// posthog-events.ts
var posthog_events_exports = {};
__export(posthog_events_exports, {
  default: () => fetchTotalEvents
});
module.exports = __toCommonJS(posthog_events_exports);
async function fetchTotalEvents(nango) {
  try {
    const lastSyncState = await nango.getMetadata();
    const lastTimestamp = lastSyncState?.["lastTimestamp"];
    await nango.log(`Starting event sync. Last timestamp: ${lastTimestamp || "none"}`);
    const params = {
      orderBy: ["timestamp"],
      limit: 500
    };
    if (lastTimestamp) {
      params.after = lastTimestamp;
    }
    const eventsGenerator = nango.paginate({
      endpoint: "/api/event/",
      params,
      paginate: {
        type: "offset",
        offset_name_in_request: "offset",
        limit: 500,
        response_path: "results"
      }
    });
    const events = [];
    for await (const batch of eventsGenerator) {
      events.push(...batch);
    }
    await nango.log(`Fetched ${events.length} events from PostHog`);
    if (events.length === 0) {
      await nango.log("No new events to sync");
      return;
    }
    const transformedEvents = events.map((event) => ({
      ...event,
      id: event.id || `${event.distinct_id}-${event.timestamp}`
      // Ensure unique ID
    }));
    await nango.batchSave(transformedEvents, "PostHogEvent");
    const latestTimestamp = events[events.length - 1]?.timestamp;
    if (latestTimestamp) {
      await nango.setMetadata({ lastTimestamp: latestTimestamp });
      await nango.log(`Updated cursor to timestamp: ${latestTimestamp}`);
    }
    await nango.log(`Successfully synced ${events.length} events`);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync PostHog events: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
