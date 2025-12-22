# Plan 1: Pipeline Core Architecture

## Overview

- **Can Start**: Immediately (no dependencies)
- **Parallel With**: Plan 2, Plan 3, Plan 7
- **Enables**: Plan 4, Plan 5

## Goals

1. Create pipeline abstraction with step-by-step execution
2. Log each step to MetricApiLog for debugging
3. Update metric.refreshStatus in real-time for frontend
4. **DELETE all old metric datapoints on force refetch**
5. Support different pipeline types (create, soft refresh, hard refresh)

---

## Task 1: Create Pipeline Types

**File**: `src/lib/pipeline/types.ts`

```typescript
export type PipelineStepName =
  | "fetching-api-data"
  | "deleting-old-data" // NEW: For force refetch
  | "generating-ingestion-transformer"
  | "executing-ingestion-transformer"
  | "saving-timeseries-data"
  | "generating-chart-transformer"
  | "executing-chart-transformer"
  | "saving-chart-config";

export type PipelineType =
  | "create" // New metric: all steps
  | "soft-refresh" // Reuse transformers
  | "hard-refresh"; // Delete old data + regenerate everything

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
```

---

## Task 2: Create Pipeline Step Configs

**File**: `src/lib/pipeline/configs.ts`

Define steps for each pipeline type:

```typescript
export const PIPELINE_CONFIGS: Record<PipelineType, StepConfig[]> = {
  // New metric creation
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

  // Quick refresh - reuse existing transformers
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

  // Force refresh - DELETE ALL OLD DATA + regenerate transformers
  "hard-refresh": [
    { step: "fetching-api-data", displayName: "Fetching data from API..." },
    { step: "deleting-old-data", displayName: "Clearing old data..." }, // DELETE STEP
    {
      step: "generating-ingestion-transformer",
      displayName: "Regenerating transformer...",
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
```

---

## Task 3: Create Pipeline Runner Class

**File**: `src/lib/pipeline/runner.ts`

```typescript
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
```

---

## Task 4: Create Delete Old Data Step

**File**: `src/lib/pipeline/steps/delete-old-data.ts`

This step runs on hard-refresh to delete all existing data:

```typescript
export async function deleteOldMetricData(
  db: PrismaClient,
  metricId: string,
): Promise<{ deletedDataPoints: number; deletedTransformer: boolean }> {
  // 1. Delete all MetricDataPoints for this metric
  const deletedDataPoints = await db.metricDataPoint.deleteMany({
    where: { metricId },
  });

  // 2. Delete DataIngestionTransformer if it exists and is metric-specific
  // (For GSheets, transformers are per-metric, not shared)
  const metric = await db.metric.findUnique({
    where: { id: metricId },
    select: { templateId: true },
  });

  let deletedTransformer = false;
  if (metric?.templateId?.startsWith("gsheets-")) {
    // GSheets transformers are per-metric
    await db.dataIngestionTransformer.deleteMany({
      where: { templateId: `${metric.templateId}:${metricId}` },
    });
    deletedTransformer = true;
  }

  // 3. Delete ChartTransformer for this metric's dashboard chart
  const dashboardChart = await db.dashboardChart.findFirst({
    where: { metricId },
    select: { id: true },
  });

  if (dashboardChart) {
    await db.chartTransformer.deleteMany({
      where: { dashboardChartId: dashboardChart.id },
    });
    deletedTransformer = true;
  }

  return {
    deletedDataPoints: deletedDataPoints.count,
    deletedTransformer,
  };
}
```

---

## Task 5: Create Index Export

**File**: `src/lib/pipeline/index.ts`

```typescript
export * from "./types";
export * from "./configs";
export { PipelineRunner } from "./runner";
export { deleteOldMetricData } from "./steps/delete-old-data";
```

---

## Task 6: Refactor data-pipeline.ts

**File**: `src/server/api/services/transformation/data-pipeline.ts`

Update `ingestMetricData` to use PipelineRunner:

```typescript
import { PipelineRunner, deleteOldMetricData } from "@/lib/pipeline";

export async function ingestMetricData(
  input: IngestInput,
): Promise<TransformResult> {
  const runner = new PipelineRunner(
    { metricId: input.metricId, organizationId: input.organizationId, db },
    "create",
  );

  try {
    // Step 1: Fetch API data
    const apiData = await runner.runStep(
      () => fetchDataFromIntegration(input),
      null,
    );

    // Step 2: Get or create ingestion transformer
    const transformer = await runner.runStep(
      () => getOrCreateIngestionTransformer(input.templateId, apiData),
      null,
    );

    // Step 3: Execute transformer
    const dataPoints = await runner.runStep(
      () =>
        executeIngestionTransformer(
          transformer.code,
          apiData,
          input.endpointConfig,
        ),
      null,
    );

    // Step 4: Save data points
    await runner.runStep(
      () => saveDataPoints(input.metricId, dataPoints),
      null,
    );

    // Step 5-7: Chart transformer steps...
    // ...

    await runner.complete();
    return { success: true, dataPoints };
  } catch (error) {
    await runner.fail(
      error instanceof Error ? error.message : "Pipeline failed",
    );
    throw error;
  }
}

export async function hardRefreshMetric(input: RefreshInput): Promise<void> {
  const runner = new PipelineRunner(
    { metricId: input.metricId, organizationId: input.organizationId, db },
    "hard-refresh",
  );

  try {
    // Step 1: Fetch API data
    const apiData = await runner.runStep(
      () => fetchDataFromIntegration(input),
      null,
    );

    // Step 2: DELETE ALL OLD DATA
    await runner.runStep(() => deleteOldMetricData(db, input.metricId), null);

    // Step 3-8: Regenerate everything from scratch
    // ...

    await runner.complete();
  } catch (error) {
    await runner.fail(
      error instanceof Error ? error.message : "Pipeline failed",
    );
    throw error;
  }
}
```

---

## Task 7: Add getProgress Endpoint

**File**: `src/server/api/routers/metric.ts` (add to existing)

```typescript
getProgress: protectedProcedure
  .input(z.object({ metricId: z.string() }))
  .query(async ({ ctx, input }) => {
    // Get current refresh status
    const metric = await ctx.db.metric.findUnique({
      where: { id: input.metricId },
      select: { refreshStatus: true, lastError: true },
    });

    if (!metric?.refreshStatus) {
      return { isProcessing: false, currentStep: null, completedSteps: [], error: metric?.lastError };
    }

    // Get recent pipeline logs (last 5 minutes)
    const recentLogs = await ctx.db.metricApiLog.findMany({
      where: {
        metricId: input.metricId,
        endpoint: { startsWith: "pipeline:" },
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
      orderBy: { createdAt: "asc" },
    });

    const completedSteps = recentLogs.map(log => {
      const response = log.rawResponse as Record<string, unknown>;
      return {
        step: (response?.step as string) ?? log.endpoint.replace("pipeline:", ""),
        displayName: (response?.displayName as string) ?? "",
        status: log.success ? "completed" : "failed",
        durationMs: response?.durationMs as number | undefined,
      };
    });

    return {
      isProcessing: true,
      currentStep: metric.refreshStatus,
      completedSteps,
      error: null,
    };
  }),
```

---

## Files Summary

| Action | File                                                      |
| ------ | --------------------------------------------------------- |
| CREATE | `src/lib/pipeline/types.ts`                               |
| CREATE | `src/lib/pipeline/configs.ts`                             |
| CREATE | `src/lib/pipeline/runner.ts`                              |
| CREATE | `src/lib/pipeline/steps/delete-old-data.ts`               |
| CREATE | `src/lib/pipeline/index.ts`                               |
| MODIFY | `src/server/api/services/transformation/data-pipeline.ts` |
| MODIFY | `src/server/api/routers/metric.ts` (add getProgress)      |

---

## Testing Checklist

- [ ] Create new metric → see all steps logged in MetricApiLog
- [ ] Soft refresh → see 5 steps, data points preserved
- [ ] Hard refresh → see "deleting-old-data" step, ALL old data points deleted
- [ ] Frontend polls getProgress → sees real-time step names
- [ ] Pipeline failure → error logged, refreshStatus cleared
