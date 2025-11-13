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
    await nango.log("Starting persons sync for all PostHog projects");
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
    let totalPersons = 0;
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
        const data = response.data;
        const persons = data.results || [];
        if (persons.length === 0) {
          await nango.log(`No persons found in project ${projectName}`);
          continue;
        }
        const transformedPersons = persons.map((person) => ({
          id: `${projectId}-${person.id?.toString() || person.distinct_id || `person-${Date.now()}`}`,
          distinct_ids: person.distinct_ids || [],
          properties: {
            ...person.properties,
            _project_id: projectId.toString(),
            _project_name: projectName
          },
          created_at: person.created_at || (/* @__PURE__ */ new Date()).toISOString(),
          is_identified: person.is_identified || false
        }));
        await nango.batchSave(transformedPersons, "PostHogPerson");
        totalPersons += transformedPersons.length;
        await nango.log(`Synced ${transformedPersons.length} persons from ${projectName}`);
      } catch (projectError) {
        const errorMessage = projectError instanceof Error ? projectError.message : String(projectError);
        await nango.log(`Error fetching persons from ${projectName}: ${errorMessage}`, { level: "error" });
      }
    }
    await nango.log(`Successfully synced ${totalPersons} total persons from ${projects.length} projects`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await nango.log(`Error in persons sync: ${errorMessage}`, { level: "error" });
    throw new nango.ActionError({
      message: `Failed to sync PostHog persons: ${errorMessage}`
    });
  }
}
