/**
 * Integration Registry Index
 * Central export point for all integration configurations
 */

export * as github from "./github";
export * as youtube from "./youtube";
export * as posthog from "./posthog";
export * as googleSheets from "./google-sheets";

// Re-export types for convenience
export type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";
