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
6. **Make ALL metrics independent (no shared transformers)**

---

## IMPORTANT: Independent Metrics (No Caching)

### Current State (Shared Transformers)

```typescript
// OLD: DataIngestionTransformer keyed by templateId (shared)
const cacheKey = input.templateId.startsWith("gsheets-")
  ? `${input.templateId}:${input.metricId}` // Only GSheets was per-metric
  : input.templateId; // All others shared
```

### New State (Independent Metrics)

```typescript
// NEW: ALL metrics use metricId as key (independent)
const cacheKey = input.metricId; // Always per-metric
```

### Why This Change?

- **Simpler mental model**: Each metric is fully independent
- **Easier debugging**: Problems with one metric don't affect others
- **Safer regeneration**: Regenerating one metric can't break others
- **More AI calls, but more robust**: Worth the tradeoff

### Backward Compatibility

Old metrics on prod have transformers keyed by `templateId`. When they do a hard refetch:

1. Pipeline looks for transformer with key `metricId` → Not found
2. Generates new transformer with key `metricId`
3. Old shared transformer remains (orphaned, can be cleaned up later)
4. **No migration needed** - just works

---

## Task 1: Create Pipeline Types

**File**: `src/lib/pipeline/types.ts`

```typescript
export type PipelineStepName =
  | "fetching-api-data"
  | "deleting-old-data" // For hard refresh
  | "deleting-old-transformer" // NEW: Delete existing transformer
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
```

---

## Task 2: Create Pipeline Step Configs

**File**: `src/lib/pipeline/configs.ts`

Define steps for each pipeline type:

```typescript
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
```

---

## Task 3: Create Pipeline Runner Class

**File**: `src/lib/pipeline/runner.ts`

```typescript
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

This step runs on hard-refresh to delete all existing data for THIS METRIC:

```typescript
import type { PrismaClient } from "@prisma/client";

export interface DeleteResult {
  deletedDataPoints: number;
  deletedIngestionTransformer: boolean;
  deletedChartTransformer: boolean;
}

/**
 * Delete all old data for a metric (used in hard refresh)
 *
 * This deletes:
 * 1. All MetricDataPoints for this metric
 * 2. The DataIngestionTransformer for this metric (keyed by metricId)
 * 3. The ChartTransformer for this metric's dashboard chart
 *
 * Does NOT delete:
 * - The Metric record itself
 * - The DashboardChart record itself
 * - The Integration connection
 */
export async function deleteOldMetricData(
  db: PrismaClient,
  metricId: string,
): Promise<DeleteResult> {
  // 1. Delete all MetricDataPoints for this metric
  const deletedDataPoints = await db.metricDataPoint.deleteMany({
    where: { metricId },
  });

  // 2. Delete DataIngestionTransformer for this metric
  // NEW: Always keyed by metricId (independent metrics)
  const deletedIngestion = await db.dataIngestionTransformer
    .delete({
      where: { templateId: metricId },
    })
    .catch(() => null); // Ignore if doesn't exist

  // 3. Delete ChartTransformer for this metric's dashboard chart
  const dashboardChart = await db.dashboardChart.findFirst({
    where: { metricId },
    select: { id: true },
  });

  let deletedChartTransformer = false;
  if (dashboardChart) {
    await db.chartTransformer
      .delete({
        where: { dashboardChartId: dashboardChart.id },
      })
      .catch(() => null); // Ignore if doesn't exist
    deletedChartTransformer = true;
  }

  return {
    deletedDataPoints: deletedDataPoints.count,
    deletedIngestionTransformer: deletedIngestion !== null,
    deletedChartTransformer,
  };
}

/**
 * Delete ONLY the ingestion transformer (for regeneration without losing data)
 */
export async function deleteIngestionTransformer(
  db: PrismaClient,
  metricId: string,
): Promise<boolean> {
  const deleted = await db.dataIngestionTransformer
    .delete({
      where: { templateId: metricId },
    })
    .catch(() => null);

  return deleted !== null;
}

/**
 * Delete ONLY the chart transformer (for regeneration without losing data)
 */
export async function deleteChartTransformer(
  db: PrismaClient,
  metricId: string,
): Promise<boolean> {
  const dashboardChart = await db.dashboardChart.findFirst({
    where: { metricId },
    select: { id: true },
  });

  if (!dashboardChart) return false;

  const deleted = await db.chartTransformer
    .delete({
      where: { dashboardChartId: dashboardChart.id },
    })
    .catch(() => null);

  return deleted !== null;
}
```

---

## Task 5: Create Index Export

**File**: `src/lib/pipeline/index.ts`

```typescript
export * from "./types";
export * from "./configs";
export { PipelineRunner } from "./runner";
export {
  deleteOldMetricData,
  deleteIngestionTransformer,
  deleteChartTransformer,
} from "./steps/delete-old-data";
```

---

## Task 6: Update data-pipeline.ts - Change Cache Key to metricId

**File**: `src/server/api/services/transformation/data-pipeline.ts`

### Key Change: Use metricId as transformer cache key

```typescript
// REMOVE this code (shared cache key):
// const cacheKey = input.templateId.startsWith("gsheets-")
//   ? `${input.templateId}:${input.metricId}`
//   : input.templateId;

// ADD this code (independent metrics):
const cacheKey = input.metricId; // Always per-metric
```

### Full Updated ingestMetricData Function

```typescript
import { PipelineRunner, deleteOldMetricData } from "@/lib/pipeline";

/**
 * Main entry point for metric data ingestion.
 * Each metric is INDEPENDENT - has its own transformer.
 */
export async function ingestMetricData(
  input: TransformAndSaveInput,
): Promise<TransformResult> {
  console.info(
    `[Transform] Starting: ${input.templateId} for metric ${input.metricId}`,
  );

  const template = getTemplate(input.templateId);
  if (!template) {
    console.error(`[Transform] ERROR: Template not found: ${input.templateId}`);
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  const fetchResult = await fetchApiDataWithLogging({
    metricId: input.metricId,
    integrationId: input.integrationId,
    connectionId: input.connectionId,
    endpoint: template.metricEndpoint,
    method: template.method,
    endpointConfig: input.endpointConfig,
    requestBody: template.requestBody,
  });

  if (!fetchResult.success) {
    console.error(
      `[Transform] ERROR: Failed to fetch data: ${fetchResult.error}`,
    );
    return {
      success: false,
      error: `Failed to fetch data: ${fetchResult.error}`,
    };
  }

  const apiData = fetchResult.data;

  // NEW: Always use metricId as cache key (independent metrics)
  const cacheKey = input.metricId;

  const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
    cacheKey,
    input.integrationId,
    template,
    apiData,
    input.endpointConfig,
  );

  if (!transformer) {
    return { success: false, error: "Failed to get or create transformer" };
  }

  if (isNew) {
    console.info(
      `[Transform] Created new transformer for metric: ${input.metricId}`,
    );
  }

  const result = await executeDataIngestionTransformer(
    transformer.transformerCode,
    apiData,
    input.endpointConfig,
  );

  if (!result.success || !result.data) {
    console.error(`[Transform] Transform failed: ${result.error}`);
    return { success: false, error: result.error };
  }

  const isTimeSeries = input.isTimeSeries !== false;
  await saveDataPointsBatch(input.metricId, result.data, isTimeSeries);

  console.info(
    `[Transform] Completed: ${result.data.length} data points saved`,
  );

  return {
    success: true,
    dataPoints: result.data,
    transformerCreated: isNew,
  };
}
```

### Update refreshMetricDataPoints

```typescript
/** Used by background jobs to refresh metric data (soft refresh). */
export async function refreshMetricDataPoints(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  metricId: string;
  endpointConfig: Record<string, string>;
  isTimeSeries?: boolean;
}): Promise<TransformResult> {
  const template = getTemplate(input.templateId);
  if (!template) {
    return { success: false, error: `Template not found: ${input.templateId}` };
  }

  // NEW: Always use metricId as cache key
  const cacheKey = input.metricId;

  const transformer = await db.dataIngestionTransformer.findUnique({
    where: { templateId: cacheKey },
  });

  if (!transformer) {
    // No transformer for this metric - need to create one
    // This handles backward compatibility for old metrics
    console.info(
      `[RefreshMetric] No transformer found for metric ${input.metricId}, creating new one`,
    );
    return ingestMetricData({
      ...input,
      isTimeSeries: input.isTimeSeries,
    });
  }

  // ... rest of function remains the same
}
```

### Update refreshMetricAndCharts for Hard Refresh

```typescript
/** Refresh metric data and update all associated charts. */
export async function refreshMetricAndCharts(
  input: RefreshMetricInput,
): Promise<RefreshMetricResult> {
  const metric = await db.metric.findUnique({
    where: { id: input.metricId },
    include: {
      integration: true,
      dashboardCharts: { include: { chartTransformer: true } },
    },
  });

  if (!metric || !metric.templateId || !metric.integration) {
    return { success: false, error: "Metric not found or not configured" };
  }

  try {
    // Step 1: Fetching API data
    await setRefreshStatus(input.metricId, "fetching-api-data");

    const template = getTemplate(metric.templateId);
    const isTimeSeries = template?.isTimeSeries !== false;

    let transformResult: TransformResult;

    if (input.forceRegenerate) {
      // HARD REFRESH: Delete everything and regenerate

      // Step 2: Delete old data points
      await setRefreshStatus(input.metricId, "deleting-old-data");
      await db.metricDataPoint.deleteMany({
        where: { metricId: metric.id },
      });

      // Step 3: Delete old transformer (keyed by metricId)
      await setRefreshStatus(input.metricId, "deleting-old-transformer");
      await db.dataIngestionTransformer
        .delete({ where: { templateId: metric.id } })
        .catch(() => {
          // Ignore if doesn't exist (backward compat: might be keyed by templateId)
        });

      // Also try to delete old shared transformer (backward compat cleanup)
      // This is optional - cleans up orphaned shared transformers
      // await db.dataIngestionTransformer
      //   .delete({ where: { templateId: metric.templateId } })
      //   .catch(() => {});

      console.info(
        `[RefreshMetric] Hard refresh - deleted old data for metric: ${metric.id}`,
      );

      // Step 4: AI regenerating transformer
      await setRefreshStatus(
        input.metricId,
        "generating-ingestion-transformer",
      );

      // Use ingestMetricData which will create new transformer
      transformResult = await ingestMetricData({
        templateId: metric.templateId,
        integrationId: metric.integration.providerId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });
    } else {
      // SOFT REFRESH: Reuse existing transformer

      // Step 2: Running existing transformer
      await setRefreshStatus(input.metricId, "executing-ingestion-transformer");

      transformResult = await refreshMetricDataPoints({
        templateId: metric.templateId,
        integrationId: metric.integration.providerId,
        connectionId: metric.integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
        isTimeSeries,
      });
    }

    if (!transformResult.success) {
      await db.metric.update({
        where: { id: input.metricId },
        data: { lastError: transformResult.error, refreshStatus: null },
      });
      return { success: false, error: transformResult.error };
    }

    // ... rest of chart update logic remains the same
  } catch (error) {
    // ... error handling remains the same
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
      return {
        isProcessing: false,
        currentStep: null,
        completedSteps: [],
        error: metric?.lastError,
      };
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

    const completedSteps = recentLogs.map((log) => {
      const response = log.rawResponse as Record<string, unknown>;
      return {
        step:
          (response?.step as string) ?? log.endpoint.replace("pipeline:", ""),
        displayName: (response?.displayName as string) ?? "",
        status: log.success ? ("completed" as const) : ("failed" as const),
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

## Task 8: (Optional) Cleanup Script for Orphaned Shared Transformers

After deploying, you can run this to clean up old shared transformers:

```typescript
// Run via Prisma Studio or a one-time script
// This finds transformers that are NOT keyed by metricId

const metrics = await db.metric.findMany({
  select: { id: true },
});

const metricIds = new Set(metrics.map((m) => m.id));

const allTransformers = await db.dataIngestionTransformer.findMany({
  select: { id: true, templateId: true },
});

const orphanedTransformers = allTransformers.filter(
  (t) => !metricIds.has(t.templateId),
);

console.log(`Found ${orphanedTransformers.length} orphaned transformers`);

// Delete orphaned transformers (uncomment to run)
// await db.dataIngestionTransformer.deleteMany({
//   where: { id: { in: orphanedTransformers.map(t => t.id) } }
// });
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

## Migration Strategy (No DB Migration Needed!)

### Before (Shared Transformers)

```
Metric A (github-commits) → uses transformer with templateId="github-commits"
Metric B (github-commits) → uses transformer with templateId="github-commits" (SHARED)
Metric C (gsheets-custom) → uses transformer with templateId="gsheets-custom:metricC" (already independent)
```

### After (Independent Metrics)

```
Metric A (github-commits) → uses transformer with templateId="metricA" (INDEPENDENT)
Metric B (github-commits) → uses transformer with templateId="metricB" (INDEPENDENT)
Metric C (gsheets-custom) → uses transformer with templateId="metricC" (INDEPENDENT)
```

### How Backward Compatibility Works

1. **New metrics**: Created with `metricId` as key → Works immediately
2. **Existing metrics (soft refresh)**: Looks for transformer with `metricId` key → Not found → Falls back to creating new one
3. **Existing metrics (hard refresh)**: Deletes transformer with `metricId` key (doesn't exist) → Creates new one
4. **Old shared transformers**: Become orphaned but don't break anything → Can be cleaned up later

---

## Task 9: ChartTransformer Unified Metadata Output

### Overview

All display metadata now comes from ChartTransformer output:

| Field         | Description                            | Example                             |
| ------------- | -------------------------------------- | ----------------------------------- |
| `title`       | Full chart title (can include context) | "Completed Issues for Backend Team" |
| `description` | How data is aggregated                 | "Weekly sum of completed issues"    |
| `valueLabel`  | Label for main value                   | "issues", "story points", "commits" |

### Why This Change?

1. **Consistency**: Goal calculation uses same data as display
2. **Per-Metric**: Each metric has its own metadata (no sharing)
3. **Context-Aware**: Title can include user name, team, project, etc.
4. **Single Source**: No fallback chains - ChartTransformer is the truth

### Update ChartTransformer AI Prompt

**File**: `src/server/api/services/transformation/ai-code-generator.ts`

Update `CHART_TRANSFORMER_SYSTEM_PROMPT` to require these fields:

```typescript
const CHART_TRANSFORMER_SYSTEM_PROMPT = `
You are a chart configuration generator.

OUTPUT REQUIREMENTS:
Return ONLY a valid JSON object with these fields:

{
  "code": "...",        // JavaScript function as string
  "reasoning": "...",   // Brief explanation

  // REQUIRED METADATA (used for display and goal calculation):
  "title": "...",       // Full descriptive title for the chart
                        // Include relevant context: metric name, team, user, project
                        // Examples: "Daily Commits", "Completed Issues for Backend Team",
                        //           "Story Points - Sprint 23", "Video Views for Channel"
                        // DO NOT include cadence if data already shows it

  "description": "...", // SHORT description of how data is aggregated and displayed
                        // Examples: "Sum of commits per day", "Running total of issues",
                        //           "Average story points per sprint"

  "valueLabel": "...",  // SHORT label for the primary value being tracked
                        // This appears next to the main number: "1,234 commits"
                        // Examples: "commits", "issues", "story points", "views"
                        // Should be lowercase, plural form

  // Chart configuration fields (existing):
  "chartType": "...",
  "xAxisLabel": "...",
  "yAxisLabel": "...",
  "dataKeys": [...],
  "showLegend": true/false
}

METADATA GENERATION RULES:
1. Title should be descriptive but not redundant with visible data
2. Don't include cadence in title if x-axis already shows time periods
3. valueLabel should match what the primary dataKey represents
4. description should explain aggregation method (sum, average, count, etc.)
`;
```

### Update ChartTransformer Output Type

**File**: `src/lib/metrics/transformer-types.ts`

```typescript
export interface ChartTransformResult {
  // Existing fields
  chartType: ChartType;
  chartConfig: Record<string, { label: string; color: string }>;
  chartData: Record<string, unknown>[];
  xAxisKey: string;
  dataKeys: string[];

  // REQUIRED metadata (from AI)
  title: string;
  description: string;
  valueLabel: string; // NEW: Moved from DataIngestionTransformer

  // Optional fields
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
}
```

### Update Chart Display to Use New Fields

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx`

```typescript
// Remove fallback chains - use ChartTransformer data directly
const chartConfig = dashboardChart.chartConfig as ChartTransformResult;

// Title - always from chartConfig
const title = chartConfig.title;

// Value label - always from chartConfig
const valueLabel = chartConfig.valueLabel;

// Description - always from chartConfig
const description = chartConfig.description;

// Display in card header:
<CardTitle>{title}</CardTitle>

// Display value with label:
<span className="text-2xl font-bold">{formatValue(currentValue)}</span>
<span className="text-xs text-muted-foreground">{valueLabel}</span>

// Tooltip description:
<TooltipContent>
  <p>{description}</p>
</TooltipContent>
```

### Deprecate DataIngestionTransformer.valueLabel

The `valueLabel` field in `DataIngestionTransformer` is no longer used for display.
ChartTransformer output is the single source of truth for all display metadata.

### Regeneration Rules

**When to regenerate ChartTransformer:**

- Data points change significantly (new data structure)
- Dimensions change (different fields available)
- User explicitly requests regeneration
- Chart type changes

**When NOT to regenerate:**

- User edits title/description/valueLabel manually (store override)
- Soft refresh (just new data, same structure)
- Label-only updates

**User Override Storage:**

Add optional override fields to chartConfig:

```typescript
// In DashboardChart.chartConfig:
{
  // AI-generated (from ChartTransformer)
  title: "Completed Issues",
  description: "Weekly sum of issues",
  valueLabel: "issues",

  // User overrides (optional, takes precedence)
  titleOverride?: "My Custom Title",
  descriptionOverride?: "My custom description",
  valueLabelOverride?: "tasks"
}
```

Display logic:

```typescript
const displayTitle = chartConfig.titleOverride ?? chartConfig.title;
const displayDescription =
  chartConfig.descriptionOverride ?? chartConfig.description;
const displayValueLabel =
  chartConfig.valueLabelOverride ?? chartConfig.valueLabel;
```

---

## Files Summary (Updated)

| Action | File                                                                |
| ------ | ------------------------------------------------------------------- |
| CREATE | `src/lib/pipeline/types.ts`                                         |
| CREATE | `src/lib/pipeline/configs.ts`                                       |
| CREATE | `src/lib/pipeline/runner.ts`                                        |
| CREATE | `src/lib/pipeline/steps/delete-old-data.ts`                         |
| CREATE | `src/lib/pipeline/index.ts`                                         |
| MODIFY | `src/server/api/services/transformation/data-pipeline.ts`           |
| MODIFY | `src/server/api/routers/metric.ts` (add getProgress)                |
| MODIFY | `src/server/api/services/transformation/ai-code-generator.ts`       |
| MODIFY | `src/lib/metrics/transformer-types.ts`                              |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx` |

---

## Testing Checklist

- [ ] Create new metric → transformer keyed by metricId
- [ ] Soft refresh existing metric → creates new transformer if not found
- [ ] Hard refresh existing metric → deletes all data, creates new transformer
- [ ] Two metrics with same template → each has independent transformer
- [ ] Frontend polls getProgress → sees real-time step names
- [ ] Pipeline failure → error logged, refreshStatus cleared
- [ ] Old metrics on prod → hard refetch regenerates without migration
- [ ] ChartTransformer generates title, description, valueLabel
- [ ] Display uses ChartTransformer metadata (no fallbacks)
- [ ] Goal calculation uses same chartConfig data
- [ ] User can override title/description/valueLabel
- [ ] Overrides persist through soft refresh
