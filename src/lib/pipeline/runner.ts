import type { PrismaClient } from "@prisma/client";

import { PIPELINE_CONFIGS } from "./configs";
import type {
  PipelineContext,
  PipelineStepName,
  PipelineType,
  StepConfig,
  StepResult,
} from "./types";

export class PipelineRunner {
  private steps: StepConfig[];
  private completedSteps: StepResult[] = [];
  private currentStepIndex = 0;
  private pipelineType: PipelineType;
  private ctx: PipelineContext;

  constructor(ctx: PipelineContext, pipelineType: PipelineType) {
    this.ctx = ctx;
    this.pipelineType = pipelineType;
    this.steps = PIPELINE_CONFIGS[pipelineType];
  }

  /**
   * Execute a step and log it
   */
  async runStep<TInput, TOutput>(
    stepFn: (input: TInput) => Promise<TOutput>,
    input: TInput,
  ): Promise<TOutput> {
    const stepConfig = this.steps[this.currentStepIndex];
    if (!stepConfig) throw new Error("No more steps in pipeline");

    // Update metric.refreshStatus for frontend polling
    await this.updateRefreshStatus(stepConfig.step);

    const startedAt = new Date();

    try {
      const result = await stepFn(input);
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();

      // Log to MetricApiLog
      await this.logStep(stepConfig, "completed", durationMs);

      this.completedSteps.push({
        ...stepConfig,
        status: "completed",
        startedAt,
        completedAt,
        durationMs,
        data: result,
      });

      this.currentStepIndex++;
      return result;
    } catch (error) {
      const completedAt = new Date();
      const durationMs = completedAt.getTime() - startedAt.getTime();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      await this.logStep(stepConfig, "failed", durationMs, errorMsg);

      this.completedSteps.push({
        ...stepConfig,
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
   * Skip current step (when not needed)
   */
  skipStep(): void {
    this.currentStepIndex++;
  }

  /**
   * Get current step info for manual status updates
   */
  getCurrentStep(): StepConfig | undefined {
    return this.steps[this.currentStepIndex];
  }

  /**
   * Manually update refresh status without running a step
   */
  async setStatus(step: PipelineStepName): Promise<void> {
    await this.updateRefreshStatus(step);
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

  /**
   * Get completed steps for debugging
   */
  getCompletedSteps(): StepResult[] {
    return [...this.completedSteps];
  }

  private async updateRefreshStatus(step: PipelineStepName): Promise<void> {
    await this.ctx.db.metric.update({
      where: { id: this.ctx.metricId },
      data: { refreshStatus: step },
    });
  }

  private async logStep(
    stepConfig: StepConfig,
    status: "completed" | "failed",
    durationMs: number,
    error?: string,
  ): Promise<void> {
    await this.ctx.db.metricApiLog.create({
      data: {
        metricId: this.ctx.metricId,
        endpoint: `pipeline:${stepConfig.step}`,
        success: status === "completed",
        rawResponse: {
          pipelineType: this.pipelineType,
          step: stepConfig.step,
          displayName: stepConfig.displayName,
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
