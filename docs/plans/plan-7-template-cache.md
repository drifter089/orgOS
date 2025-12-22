# Plan 7: Template-Level Transformer Cache

## Overview

- **Can Start**: Immediately (no dependencies)
- **Parallel With**: Plan 1, Plan 2, Plan 3
- **Enables**: Nothing (independent)

## Goals

1. Allow regenerating ingestion transformer independently of chart transformer
2. Allow regenerating chart transformer independently
3. Cache transformers at template level (shared) vs metric level (unique)
4. Make it easy to fix bad transformers without full pipeline re-run

---

## Current State

Currently, transformers are cached:

- **DataIngestionTransformer**: Cached by `templateId` (shared across all metrics using same template)
  - Exception: GSheets uses `templateId:metricId` (per-metric)
- **ChartTransformer**: Cached by `dashboardChartId` (per-chart, unique)

Problem: No way to regenerate just one transformer. Full refresh regenerates both.

---

## Task 1: Add Router Procedures for Individual Regeneration

**File**: `src/server/api/routers/pipeline.ts` (or `transformer.ts`)

```typescript
/**
 * Regenerate ONLY the ingestion transformer for a metric
 * Does NOT touch chart transformer or data points
 */
regenerateIngestionTransformer: protectedProcedure
  .input(z.object({ metricId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const metric = await getMetricAndVerifyAccess(
      ctx.db,
      input.metricId,
      ctx.user.id,
      ctx.workspace
    );

    if (!metric.templateId) {
      throw new Error("Manual metrics don't have ingestion transformers");
    }

    // Determine cache key
    const cacheKey = metric.templateId.startsWith("gsheets-")
      ? `${metric.templateId}:${metric.id}`  // Per-metric for GSheets
      : metric.templateId;                    // Shared for others

    // Delete existing transformer
    await ctx.db.dataIngestionTransformer.deleteMany({
      where: { templateId: cacheKey },
    });

    // Update status
    await ctx.db.metric.update({
      where: { id: input.metricId },
      data: { refreshStatus: "generating-ingestion-transformer" },
    });

    try {
      // Fetch fresh API data
      const apiData = await fetchDataFromIntegration(metric);

      // Generate new transformer
      const transformer = await generateIngestionTransformer({
        templateId: metric.templateId,
        apiResponse: apiData,
        endpointConfig: metric.endpointConfig,
      });

      // Save transformer
      await ctx.db.dataIngestionTransformer.create({
        data: {
          templateId: cacheKey,
          transformerCode: transformer.code,
          valueLabel: transformer.valueLabel,
          dataDescription: transformer.dataDescription,
          extractionPromptUsed: transformer.extractionPromptUsed,
        },
      });

      // Clear status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: null },
      });

      return { success: true, transformerId: cacheKey };

    } catch (error) {
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: {
          refreshStatus: null,
          lastError: error instanceof Error ? error.message : "Failed",
        },
      });
      throw error;
    }
  }),

/**
 * Regenerate ONLY the chart transformer for a metric
 * Does NOT touch ingestion transformer or raw data points
 */
regenerateChartTransformer: protectedProcedure
  .input(z.object({ metricId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    await getMetricAndVerifyAccess(
      ctx.db,
      input.metricId,
      ctx.user.id,
      ctx.workspace
    );

    const dashboardChart = await ctx.db.dashboardChart.findFirst({
      where: { metricId: input.metricId },
    });

    if (!dashboardChart) {
      throw new Error("Dashboard chart not found");
    }

    // Delete existing chart transformer
    await ctx.db.chartTransformer.deleteMany({
      where: { dashboardChartId: dashboardChart.id },
    });

    // Update status
    await ctx.db.metric.update({
      where: { id: input.metricId },
      data: { refreshStatus: "generating-chart-transformer" },
    });

    try {
      // Get existing data points
      const dataPoints = await ctx.db.metricDataPoint.findMany({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "asc" },
        take: 1000,
      });

      if (dataPoints.length === 0) {
        throw new Error("No data points to chart");
      }

      // Get metric info for AI context
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      // Generate new chart transformer
      const chartTransformer = await generateChartTransformer({
        metricName: metric?.name ?? "Metric",
        metricDescription: metric?.description ?? "",
        dataPoints,
      });

      // Save transformer
      await ctx.db.chartTransformer.create({
        data: {
          dashboardChartId: dashboardChart.id,
          transformerCode: chartTransformer.code,
          chartType: chartTransformer.chartType,
          cadence: chartTransformer.cadence,
          userPrompt: null,
        },
      });

      // Execute and save chart config
      const chartConfig = await executeChartTransformer(
        chartTransformer.code,
        dataPoints,
        { chartType: chartTransformer.chartType, cadence: chartTransformer.cadence }
      );

      await ctx.db.dashboardChart.update({
        where: { id: dashboardChart.id },
        data: { chartConfig },
      });

      // Clear status
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: null },
      });

      return { success: true };

    } catch (error) {
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: {
          refreshStatus: null,
          lastError: error instanceof Error ? error.message : "Failed",
        },
      });
      throw error;
    }
  }),
```

---

## Task 2: Add UI Buttons for Individual Regeneration

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx`

Add buttons in the settings drawer:

```typescript
// In the drawer content, add:
<div className="space-y-2">
  <h4 className="text-sm font-medium">Transformer Actions</h4>

  <Button
    variant="outline"
    size="sm"
    onClick={() => regenerateIngestion.mutate({ metricId })}
    disabled={regenerateIngestion.isPending || isManualMetric}
  >
    {regenerateIngestion.isPending ? (
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
    ) : (
      <RefreshCw className="h-4 w-4 mr-2" />
    )}
    Regenerate Data Transformer
  </Button>

  <Button
    variant="outline"
    size="sm"
    onClick={() => regenerateChart.mutate({ metricId })}
    disabled={regenerateChart.isPending}
  >
    {regenerateChart.isPending ? (
      <Loader2 className="h-4 w-4 animate-spin mr-2" />
    ) : (
      <BarChart3 className="h-4 w-4 mr-2" />
    )}
    Regenerate Chart
  </Button>

  <p className="text-xs text-muted-foreground">
    Use these to fix bad AI-generated transformers without deleting data.
  </p>
</div>
```

---

## Task 3: Template Cache Documentation

Add helper to check if template uses shared or per-metric cache:

**File**: `src/lib/integrations/cache-strategy.ts`

```typescript
/**
 * Determine cache strategy for a template
 * - "shared": One transformer shared across all metrics (most integrations)
 * - "per-metric": Each metric has its own transformer (GSheets)
 */
export function getTransformerCacheStrategy(
  templateId: string,
): "shared" | "per-metric" {
  // GSheets uses per-metric because each spreadsheet has different structure
  if (templateId.startsWith("gsheets-")) {
    return "per-metric";
  }

  // All other integrations share transformers
  return "shared";
}

/**
 * Get the cache key for a transformer
 */
export function getTransformerCacheKey(
  templateId: string,
  metricId: string,
): string {
  const strategy = getTransformerCacheStrategy(templateId);

  if (strategy === "per-metric") {
    return `${templateId}:${metricId}`;
  }

  return templateId;
}
```

---

## Task 4: Update Pipeline to Use Cache Strategy

**File**: `src/server/api/services/transformation/data-pipeline.ts`

```typescript
import {
  getTransformerCacheKey,
  getTransformerCacheStrategy,
} from "@/lib/integrations/cache-strategy";

async function getOrCreateIngestionTransformer(
  templateId: string,
  metricId: string,
  apiData: unknown,
) {
  const cacheKey = getTransformerCacheKey(templateId, metricId);

  // Check cache
  const existing = await db.dataIngestionTransformer.findUnique({
    where: { templateId: cacheKey },
  });

  if (existing) {
    return existing;
  }

  // Generate new
  const transformer = await generateIngestionTransformer({
    templateId,
    apiData,
  });

  // Save to cache
  return db.dataIngestionTransformer.create({
    data: {
      templateId: cacheKey,
      transformerCode: transformer.code,
      valueLabel: transformer.valueLabel,
      dataDescription: transformer.dataDescription,
    },
  });
}
```

---

## Task 5: Add Transformer Info to Dashboard

Show which transformer version is being used:

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx`

```typescript
// Fetch transformer info
const { data: transformerInfo } = api.metric.getTransformerInfo.useQuery({ metricId });

// Display in drawer:
<div className="text-xs text-muted-foreground space-y-1">
  <p>Cache: {transformerInfo?.cacheStrategy}</p>
  <p>Ingestion updated: {transformerInfo?.ingestionUpdatedAt?.toLocaleDateString()}</p>
  <p>Chart updated: {transformerInfo?.chartUpdatedAt?.toLocaleDateString()}</p>
</div>
```

---

## Files Summary

| Action | File                                                                 |
| ------ | -------------------------------------------------------------------- |
| CREATE | `src/lib/integrations/cache-strategy.ts`                             |
| MODIFY | `src/server/api/routers/pipeline.ts` (add regenerate procedures)     |
| MODIFY | `src/server/api/services/transformation/data-pipeline.ts`            |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx` |

---

## Cache Strategy Summary

| Template Type | Cache Strategy | Cache Key                  |
| ------------- | -------------- | -------------------------- |
| GitHub        | Shared         | `github-commits`           |
| Linear        | Shared         | `linear-issues`            |
| YouTube       | Shared         | `youtube-views`            |
| PostHog       | Shared         | `posthog-events`           |
| Google Sheets | Per-Metric     | `gsheets-custom:metric123` |

---

## Testing Checklist

- [ ] Regenerate ingestion transformer only → data points preserved
- [ ] Regenerate chart transformer only → data points preserved
- [ ] GSheets regenerate → only affects that metric
- [ ] GitHub regenerate → affects all metrics using same template
- [ ] UI buttons work correctly
- [ ] Progress shows during regeneration
- [ ] Error handling works
