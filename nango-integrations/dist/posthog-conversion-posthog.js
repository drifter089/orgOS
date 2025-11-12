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

// posthog-conversion.ts
var posthog_conversion_exports = {};
__export(posthog_conversion_exports, {
  default: () => fetchConversionRate
});
module.exports = __toCommonJS(posthog_conversion_exports);
async function fetchConversionRate(nango) {
  try {
    const connection = await nango.getConnection();
    const config = connection.connection_config;
    const funnelSteps = config?.funnel_steps;
    if (!funnelSteps || !Array.isArray(funnelSteps) || funnelSteps.length < 2) {
      await nango.log("No funnel steps configured. Using default: pageview -> signup");
      const defaultSteps = ["$pageview", "signup_started", "signup_completed"];
      await calculateFunnel(nango, defaultSteps);
      return;
    }
    await nango.log(`Calculating conversion funnel with ${funnelSteps.length} steps: ${funnelSteps.join(" \u2192 ")}`);
    await calculateFunnel(nango, funnelSteps);
  } catch (error) {
    throw new nango.ActionError({
      message: `Failed to sync conversion rate: ${error instanceof Error ? error.message : "Unknown error"}`
    });
  }
}
async function calculateFunnel(nango, funnelSteps) {
  const connection = await nango.getConnection();
  const config = connection.connection_config;
  const dateFrom = config?.date_from || "-7d";
  const dateTo = config?.date_to || "now";
  const response = await nango.post({
    endpoint: "/api/insights/funnel/",
    data: {
      events: funnelSteps.map((step, index) => ({
        id: step,
        order: index,
        type: "events"
      })),
      date_from: dateFrom,
      date_to: dateTo,
      insight: "FUNNELS",
      funnel_viz_type: "steps"
    }
  });
  const results = response.data.result || response.data;
  const totalUsers = results[0]?.count || 0;
  const convertedUsers = results[results.length - 1]?.count || 0;
  const conversionRate = totalUsers > 0 ? convertedUsers / totalUsers * 100 : 0;
  const conversionData = {
    id: `funnel-${Date.now()}`,
    conversion_rate: Math.round(conversionRate * 100) / 100,
    // Round to 2 decimals
    total_users: totalUsers,
    converted_users: convertedUsers,
    funnel_steps: funnelSteps,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  };
  await nango.batchSave([conversionData], "PostHogConversionData");
  await nango.log(`Conversion rate: ${conversionRate.toFixed(2)}% (${convertedUsers}/${totalUsers} users)`);
}
