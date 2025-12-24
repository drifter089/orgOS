/**
 * Pipeline Steps - Single source of truth for all step definitions
 *
 * This file defines all pipeline steps with their display names.
 * Used by both frontend (progress display) and backend (logging).
 */

export const PIPELINE_STEPS = {
  // Frontend-only states (not stored in DB)
  processing: {
    displayName: "Processing...",
    shortName: "Processing...",
  },
  "loading-data": {
    displayName: "Loading chart data...",
    shortName: "Loading chart...",
  },
  // Actual pipeline steps
  "adding-metric": {
    displayName: "Adding metric...",
    shortName: "Adding metric...",
  },
  "fetching-api-data": {
    displayName: "Fetching data from API...",
    shortName: "Fetching data...",
  },
  "deleting-old-data": {
    displayName: "Clearing old data points...",
    shortName: "Clearing old data...",
  },
  "deleting-old-transformer": {
    displayName: "Removing old transformer...",
    shortName: "Removing old transformer...",
  },
  "generating-ingestion-transformer": {
    displayName: "Generating data transformer...",
    shortName: "Generating transformer...",
  },
  "executing-ingestion-transformer": {
    displayName: "Processing API response...",
    shortName: "Processing data...",
  },
  "saving-timeseries-data": {
    displayName: "Saving metric data...",
    shortName: "Saving data...",
  },
  "generating-chart-transformer": {
    displayName: "Generating chart configuration...",
    shortName: "Generating chart...",
  },
  "executing-chart-transformer": {
    displayName: "Creating visualization...",
    shortName: "Creating visualization...",
  },
  "saving-chart-config": {
    displayName: "Finalizing...",
    shortName: "Finalizing...",
  },
} as const;

export type PipelineStepName = keyof typeof PIPELINE_STEPS;

/**
 * Get display name for a step (full version for backend logging)
 */
export function getStepDisplayName(step: string): string {
  const stepInfo = PIPELINE_STEPS[step as PipelineStepName];
  return stepInfo?.displayName ?? step;
}

/**
 * Get short display name for a step (for frontend progress)
 */
export function getStepShortName(step: string): string {
  const stepInfo = PIPELINE_STEPS[step as PipelineStepName];
  return stepInfo?.shortName ?? step;
}

/**
 * Pipeline operation types - what the pipeline can do
 */
export type PipelineOperation =
  | "fetch-data" // Fetch data from API
  | "delete-data" // Delete existing data points
  | "delete-ingestion-transformer" // Delete ingestion transformer
  | "delete-chart-transformer" // Delete chart transformer
  | "generate-ingestion-transformer" // Generate new ingestion transformer (AI)
  | "execute-ingestion-transformer" // Execute existing ingestion transformer
  | "save-data" // Save data points to DB
  | "generate-chart-transformer" // Generate new chart transformer (AI)
  | "execute-chart-transformer" // Execute existing chart transformer
  | "save-chart"; // Save chart config to DB

/**
 * Pipeline type definitions - each type specifies which operations to run
 *
 * The key insight: all pipelines share the same operations, just with different flags.
 * - hard-refresh = soft-refresh + delete + regenerate
 * - create = hard-refresh (delete is no-op for new metric)
 * - chart-only = just regenerate chart (no data fetch)
 */
export const PIPELINE_OPERATIONS = {
  // Soft refresh: fetch new data, use existing transformers
  "soft-refresh": [
    "fetch-data",
    "execute-ingestion-transformer",
    "save-data",
    "execute-chart-transformer",
    "save-chart",
  ],
  // Hard refresh: delete everything, regenerate from scratch
  // Also used for create (delete is no-op for new metric)
  "hard-refresh": [
    "fetch-data",
    "delete-data",
    "delete-ingestion-transformer",
    "generate-ingestion-transformer",
    "execute-ingestion-transformer",
    "save-data",
    "delete-chart-transformer",
    "generate-chart-transformer",
    "execute-chart-transformer",
    "save-chart",
  ],
  // Chart config update: regenerate chart transformer only (no data fetch)
  "chart-only": [
    "delete-chart-transformer",
    "generate-chart-transformer",
    "execute-chart-transformer",
    "save-chart",
  ],
  // Ingestion only: regenerate ingestion transformer, keep chart
  "ingestion-only": [
    "fetch-data",
    "delete-ingestion-transformer",
    "generate-ingestion-transformer",
    "execute-ingestion-transformer",
    "save-data",
    "execute-chart-transformer",
    "save-chart",
  ],
} as const satisfies Record<string, readonly PipelineOperation[]>;

export type PipelineType = keyof typeof PIPELINE_OPERATIONS;

/**
 * Map operations to their corresponding step names (for progress tracking)
 */
export const OPERATION_TO_STEP: Record<PipelineOperation, PipelineStepName> = {
  "fetch-data": "fetching-api-data",
  "delete-data": "deleting-old-data",
  "delete-ingestion-transformer": "deleting-old-transformer",
  "delete-chart-transformer": "deleting-old-transformer",
  "generate-ingestion-transformer": "generating-ingestion-transformer",
  "execute-ingestion-transformer": "executing-ingestion-transformer",
  "save-data": "saving-timeseries-data",
  "generate-chart-transformer": "generating-chart-transformer",
  "execute-chart-transformer": "executing-chart-transformer",
  "save-chart": "saving-chart-config",
};

/**
 * Get total step count for a pipeline type (for progress calculation)
 */
export function getPipelineStepCount(type: PipelineType): number {
  return PIPELINE_OPERATIONS[type].length;
}

/**
 * Detect pipeline type from completed steps (for frontend progress)
 *
 * Detection logic based on unique steps per pipeline type:
 * - hard-refresh: has deleting-old-data (only hard-refresh deletes data points)
 * - ingestion-only: has deleting-old-transformer + generating-ingestion-transformer, but NO deleting-old-data
 * - chart-only: no fetching-api-data (chart regeneration without data fetch)
 * - soft-refresh: default (no deletes, just refresh with existing transformers)
 */
export function detectPipelineType(completedSteps: string[]): PipelineType {
  const hasDeleteDataStep = completedSteps.includes("deleting-old-data");
  const hasDeleteTransformerStep = completedSteps.includes(
    "deleting-old-transformer",
  );
  const hasGenerateIngestionStep = completedSteps.includes(
    "generating-ingestion-transformer",
  );
  const hasFetchStep = completedSteps.includes("fetching-api-data");

  // chart-only: no data fetch, just regenerate chart
  if (!hasFetchStep) {
    return "chart-only";
  }

  // hard-refresh: deletes data points (unique to hard-refresh)
  if (hasDeleteDataStep) {
    return "hard-refresh";
  }

  // ingestion-only: regenerates ingestion transformer without deleting data
  if (hasDeleteTransformerStep && hasGenerateIngestionStep) {
    return "ingestion-only";
  }

  // soft-refresh: uses existing transformers
  return "soft-refresh";
}
