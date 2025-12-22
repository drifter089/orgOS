import type { PrismaClient } from "@prisma/client";

export type PipelineStepName =
  | "fetching-api-data"
  | "deleting-old-data"
  | "deleting-old-transformer"
  | "generating-ingestion-transformer"
  | "executing-ingestion-transformer"
  | "saving-timeseries-data"
  | "generating-chart-transformer"
  | "executing-chart-transformer"
  | "saving-chart-config";

export type PipelineType =
  | "create" // New metric: all steps
  | "soft-refresh" // Reuse transformers, just fetch new data
  | "hard-refresh"; // Delete ALL old data + regenerate everything

export interface StepConfig {
  step: PipelineStepName;
  displayName: string;
}

export interface StepResult<T = unknown> {
  step: PipelineStepName;
  displayName: string;
  status: "completed" | "failed" | "skipped";
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  data?: T;
  error?: string;
}

export interface PipelineContext {
  metricId: string;
  dashboardChartId?: string;
  organizationId: string;
  db: PrismaClient;
}
