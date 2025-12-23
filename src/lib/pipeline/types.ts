import type { PrismaClient } from "@prisma/client";

// Re-export step types from steps.ts (single source of truth)
export type {
  PipelineStepName,
  PipelineOperation,
  PipelineType,
} from "./steps";

/**
 * Context passed to pipeline runner
 */
export interface PipelineContext {
  metricId: string;
  dashboardChartId?: string;
  organizationId: string;
  db: PrismaClient;
}

/**
 * Result of a completed pipeline step
 */
export interface StepResult<T = unknown> {
  step: string;
  displayName: string;
  status: "completed" | "failed" | "skipped";
  startedAt: Date;
  completedAt: Date;
  durationMs: number;
  data?: T;
  error?: string;
}
