import type { PrismaClient } from "@prisma/client";

import {
  OPERATION_TO_STEP,
  type PipelineOperation,
  type PipelineStepName,
  type PipelineType,
  getStepDisplayName,
} from "./steps";
import type { PipelineContext, StepResult } from "./types";

/**
 * Pipeline Runner
 *
 * Orchestrates pipeline operations with:
 * - Progress tracking via metric.refreshStatus
 * - Step logging to MetricApiLog
 * - Error handling with lastError updates
 *
 * Usage:
 *   const runner = new PipelineRunner(ctx, "soft-refresh");
 *   await runner.run("fetch-data", () => fetchData());
 *   await runner.run("execute-ingestion-transformer", () => executeTransformer());
 *   await runner.complete();
 */
export class PipelineRunner {
  private completedSteps: StepResult[] = [];
  private pipelineType: PipelineType;
  private ctx: PipelineContext;

  constructor(ctx: PipelineContext, pipelineType: PipelineType) {
    this.ctx = ctx;
    this.pipelineType = pipelineType;
  }

  /**
   * Run an operation and track its progress
   */
  async run<T>(operation: PipelineOperation, fn: () => Promise<T>): Promise<T> {
    const stepName = OPERATION_TO_STEP[operation];
    const displayName = getStepDisplayName(stepName);

    // Update metric.refreshStatus for frontend polling
    await this.updateRefreshStatus(stepName);

    const startedAt = new Date();

    try {
      const result = await fn();
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // Log to MetricApiLog
      await this.logStep(stepName, displayName, "completed", durationMs);

      this.completedSteps.push({
        step: stepName,
        displayName,
        status: "completed",
        startedAt,
        completedAt,
        durationMs,
        data: result,
      });

      return result;
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      await this.logStep(stepName, displayName, "failed", durationMs, errorMsg);

      this.completedSteps.push({
        step: stepName,
        displayName,
        status: "failed",
        startedAt,
        completedAt,
        durationMs,
        error: errorMsg,
      });

      throw error;
    }
  }

  /**
   * Manually update status without running an operation
   * Useful when a step is handled by called functions
   */
  async setStatus(step: PipelineStepName): Promise<void> {
    await this.updateRefreshStatus(step);
    // Log step transition for progress tracking
    await this.ctx.db.metricApiLog
      .create({
        data: {
          metricId: this.ctx.metricId,
          endpoint: `pipeline-step:${step}`,
          success: true,
          rawResponse: {
            pipelineType: this.pipelineType,
            step,
            status: "started",
            timestamp: new Date().toISOString(),
          },
        },
      })
      .catch(() => undefined); // Non-blocking
  }

  /**
   * Clear refreshStatus when pipeline completes
   */
  async complete(): Promise<void> {
    await this.ctx.db.metric.update({
      where: { id: this.ctx.metricId },
      data: {
        refreshStatus: null,
        lastFetchedAt: new Date(),
        lastError: null,
      },
    });
  }

  /**
   * Mark pipeline as failed
   */
  async fail(error: string): Promise<void> {
    await this.ctx.db.metric.update({
      where: { id: this.ctx.metricId },
      data: {
        refreshStatus: null,
        lastError: error,
      },
    });
  }

  private async updateRefreshStatus(step: PipelineStepName): Promise<void> {
    await this.ctx.db.metric.update({
      where: { id: this.ctx.metricId },
      data: { refreshStatus: step },
    });
  }

  private async logStep(
    step: string,
    displayName: string,
    status: "completed" | "failed",
    durationMs: number,
    error?: string,
  ): Promise<void> {
    await this.ctx.db.metricApiLog.create({
      data: {
        metricId: this.ctx.metricId,
        endpoint: `pipeline-step:${step}`,
        success: status === "completed",
        rawResponse: {
          pipelineType: this.pipelineType,
          step,
          displayName,
          status,
          durationMs,
          error,
          timestamp: new Date().toISOString(),
        },
      },
    });
  }
}

/**
 * Factory function to create a pipeline runner
 */
export function createPipelineRunner(
  db: PrismaClient,
  metricId: string,
  organizationId: string,
  pipelineType: PipelineType,
  dashboardChartId?: string,
): PipelineRunner {
  return new PipelineRunner(
    {
      metricId,
      dashboardChartId,
      organizationId,
      db,
    },
    pipelineType,
  );
}
