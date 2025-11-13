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
    await nango.log("Starting events sync for all PostHog projects");
    const projectsResponse = await nango.get({
      endpoint: "/api/projects/"
    });
    const projectsData = projectsResponse.data;
    const projects = projectsData.results || [];
    await nango.log(`Found ${projects.length} accessible projects`);
    if (projects.length === 0) {
      await nango.log("No projects found");
      return;
    }
    let totalEvents = 0;
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
        const data = response.data;
        const events = data.results || [];
        if (events.length === 0) {
          await nango.log(`No events found in project ${projectName}`);
          continue;
        }
        const transformedEvents = events.map((event) => ({
          id: `${projectId}-${event.id?.toString() || `${event.distinct_id}-${event.timestamp}`}`,
          event: event.event || "",
          distinct_id: event.distinct_id || "",
          properties: {
            ...event.properties,
            _project_id: projectId.toString(),
            _project_name: projectName
          },
          timestamp: event.timestamp || (/* @__PURE__ */ new Date()).toISOString()
        }));
        await nango.batchSave(transformedEvents, "PostHogEvent");
        totalEvents += transformedEvents.length;
        await nango.log(`Synced ${transformedEvents.length} events from ${projectName}`);
      } catch (projectError) {
        const errorMessage = projectError instanceof Error ? projectError.message : String(projectError);
        await nango.log(`Error fetching events from ${projectName}: ${errorMessage}`, { level: "error" });
      }
    }
    await nango.log(`Successfully synced ${totalEvents} total events from ${projects.length} projects`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await nango.log(`Error in events sync: ${errorMessage}`, { level: "error" });
    throw new nango.ActionError({
      message: `Failed to sync PostHog events: ${errorMessage}`
    });
  }
}
