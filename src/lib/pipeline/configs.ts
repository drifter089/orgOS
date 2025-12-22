import type { PipelineType, StepConfig } from "./types";

export const PIPELINE_CONFIGS: Record<PipelineType, StepConfig[]> = {
  // New metric creation - always generates fresh transformer
  create: [
    { step: "fetching-api-data", displayName: "Fetching data from API..." },
    {
      step: "generating-ingestion-transformer",
      displayName: "Generating data transformer...",
    },
    {
      step: "executing-ingestion-transformer",
      displayName: "Processing API response...",
    },
    { step: "saving-timeseries-data", displayName: "Saving metric data..." },
    {
      step: "generating-chart-transformer",
      displayName: "Generating chart...",
    },
    {
      step: "executing-chart-transformer",
      displayName: "Creating visualization...",
    },
    { step: "saving-chart-config", displayName: "Finalizing..." },
  ],

  // Quick refresh - reuse existing transformers, just get new data
  "soft-refresh": [
    { step: "fetching-api-data", displayName: "Fetching latest data..." },
    {
      step: "executing-ingestion-transformer",
      displayName: "Processing data...",
    },
    { step: "saving-timeseries-data", displayName: "Updating metric..." },
    { step: "executing-chart-transformer", displayName: "Updating chart..." },
    { step: "saving-chart-config", displayName: "Saving..." },
  ],

  // Force refresh - DELETE EVERYTHING and regenerate from scratch
  "hard-refresh": [
    { step: "fetching-api-data", displayName: "Fetching data from API..." },
    { step: "deleting-old-data", displayName: "Clearing old data points..." },
    {
      step: "deleting-old-transformer",
      displayName: "Clearing old transformer...",
    },
    {
      step: "generating-ingestion-transformer",
      displayName: "Regenerating data transformer...",
    },
    {
      step: "executing-ingestion-transformer",
      displayName: "Processing response...",
    },
    { step: "saving-timeseries-data", displayName: "Saving fresh data..." },
    {
      step: "generating-chart-transformer",
      displayName: "Regenerating chart...",
    },
    {
      step: "executing-chart-transformer",
      displayName: "Creating visualization...",
    },
    { step: "saving-chart-config", displayName: "Finalizing..." },
  ],
};
