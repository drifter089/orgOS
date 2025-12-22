# Plan 7: Independent Transformer Regeneration

## Overview

- **Can Start**: Immediately (no dependencies)
- **Parallel With**: Plan 1, Plan 2, Plan 3
- **Enables**: Nothing (independent)

## Goals

1. Allow regenerating ingestion transformer independently of chart transformer
2. Allow regenerating chart transformer independently
3. ~~Cache transformers at template level~~ **UPDATED: All metrics are now independent (no caching)**
4. Make it easy to fix bad transformers without full pipeline re-run

---

## IMPORTANT: This Plan Updated for Independent Metrics

**Plan 1** introduces independent metrics where each metric has its own transformer keyed by `metricId`. This plan now focuses on:

- **Regenerate ingestion transformer only** (keep chart transformer and data points)
- **Regenerate chart transformer only** (keep ingestion transformer and data points)
- UI buttons for granular control

---

## Current State (After Plan 1)

Each metric is fully independent:

- **DataIngestionTransformer**: Keyed by `metricId` (one per metric)
- **ChartTransformer**: Keyed by `dashboardChartId` (one per chart/metric)
- **MetricDataPoints**: Belong to specific metric

---

## Task 1: Add Router Procedures for Individual Regeneration

**File**: `src/server/api/routers/transformer.ts`

```typescript
/**
 * Regenerate ONLY the ingestion transformer for a metric
 * Keeps existing data points and chart transformer
 */
regenerateIngestionTransformer: workspaceProcedure
  .input(z.object({ metricId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const metric = await getMetricAndVerifyAccess(
      db,
      input.metricId,
      ctx.workspace.organizationId,
    );

    if (!metric.templateId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Manual metrics don't have ingestion transformers",
      });
    }

    const integration = await db.integration.findUnique({
      where: { id: metric.integrationId! },
    });

    if (!integration) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Integration not found",
      });
    }

    // Update status
    await db.metric.update({
      where: { id: input.metricId },
      data: { refreshStatus: "deleting-old-transformer" },
    });

    try {
      // Delete existing transformer (keyed by metricId)
      await db.dataIngestionTransformer
        .delete({
          where: { templateId: input.metricId },
        })
        .catch(() => null); // Ignore if doesn't exist

      // Update status
      await db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "generating-ingestion-transformer" },
      });

      // Re-run ingestion (will create new transformer)
      const result = await ingestMetricData({
        templateId: metric.templateId,
        integrationId: integration.providerId,
        connectionId: integration.connectionId,
        metricId: metric.id,
        endpointConfig: (metric.endpointConfig as Record<string, string>) ?? {},
      });

      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.error ?? "Failed to regenerate transformer",
        });
      }

      // Clear status
      await db.metric.update({
        where: { id: input.metricId },
        data: {
          refreshStatus: null,
          lastFetchedAt: new Date(),
          lastError: null,
        },
      });

      return {
        success: true,
        dataPointCount: result.dataPoints?.length ?? 0,
      };
    } catch (error) {
      await db.metric.update({
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
 * Keeps existing data points and ingestion transformer
 */
regenerateChartTransformerOnly: workspaceProcedure
  .input(z.object({ metricId: z.string() }))
  .mutation(async ({ ctx, input }) => {
    const metric = await getMetricAndVerifyAccess(
      db,
      input.metricId,
      ctx.workspace.organizationId,
    );

    const dashboardChart = await db.dashboardChart.findFirst({
      where: { metricId: input.metricId },
    });

    if (!dashboardChart) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Dashboard chart not found",
      });
    }

    // Update status
    await db.metric.update({
      where: { id: input.metricId },
      data: { refreshStatus: "deleting-old-transformer" },
    });

    try {
      // Delete existing chart transformer
      await db.chartTransformer
        .delete({
          where: { dashboardChartId: dashboardChart.id },
        })
        .catch(() => null); // Ignore if doesn't exist

      // Update status
      await db.metric.update({
        where: { id: input.metricId },
        data: { refreshStatus: "generating-chart-transformer" },
      });

      // Get existing data points
      const dataPoints = await db.metricDataPoint.findMany({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "desc" },
        take: 1000,
      });

      if (dataPoints.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No data points to chart",
        });
      }

      // Generate new chart transformer
      await createChartTransformer({
        dashboardChartId: dashboardChart.id,
        metricName: metric.name,
        metricDescription: metric.description ?? "",
        chartType: dashboardChart.chartType ?? "line",
        cadence: "DAILY", // Default, will be adjusted by AI
      });

      // Clear status
      await db.metric.update({
        where: { id: input.metricId },
        data: {
          refreshStatus: null,
          lastError: null,
        },
      });

      return { success: true };
    } catch (error) {
      await db.metric.update({
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
import { BarChart3, Database, Loader2, RefreshCw } from "lucide-react";

// In the drawer component:
const regenerateIngestion = api.transformer.regenerateIngestionTransformer.useMutation({
  onSuccess: () => {
    toast.success("Data transformer regenerated");
    void utils.dashboard.getDashboardCharts.invalidate();
  },
  onError: (error) => {
    toast.error(`Failed: ${error.message}`);
  },
});

const regenerateChart = api.transformer.regenerateChartTransformerOnly.useMutation({
  onSuccess: () => {
    toast.success("Chart regenerated");
    void utils.dashboard.getDashboardCharts.invalidate();
  },
  onError: (error) => {
    toast.error(`Failed: ${error.message}`);
  },
});

const isManualMetric = !dashboardChart.metric.templateId;
const isRegenerating = regenerateIngestion.isPending || regenerateChart.isPending;

// In JSX:
<div className="space-y-3">
  <h4 className="text-sm font-medium">Transformer Actions</h4>
  <p className="text-xs text-muted-foreground">
    Regenerate individual transformers without losing all data.
  </p>

  <div className="flex gap-2">
    <Button
      variant="outline"
      size="sm"
      onClick={() => regenerateIngestion.mutate({ metricId })}
      disabled={isRegenerating || isManualMetric}
      className="flex-1"
    >
      {regenerateIngestion.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <Database className="h-4 w-4 mr-2" />
      )}
      Regenerate Data
    </Button>

    <Button
      variant="outline"
      size="sm"
      onClick={() => regenerateChart.mutate({ metricId })}
      disabled={isRegenerating}
      className="flex-1"
    >
      {regenerateChart.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : (
        <BarChart3 className="h-4 w-4 mr-2" />
      )}
      Regenerate Chart
    </Button>
  </div>

  {isManualMetric && (
    <p className="text-xs text-muted-foreground">
      Manual metrics don't have data transformers.
    </p>
  )}
</div>
```

---

## Task 3: Add Transformer Info Display

Show which transformers exist and when they were created:

**File**: `src/server/api/routers/transformer.ts`

```typescript
/**
 * Get transformer info for a metric
 */
getTransformerInfo: workspaceProcedure
  .input(z.object({ metricId: z.string() }))
  .query(async ({ ctx, input }) => {
    await getMetricAndVerifyAccess(
      db,
      input.metricId,
      ctx.workspace.organizationId,
    );

    // Get ingestion transformer (keyed by metricId)
    const ingestionTransformer = await db.dataIngestionTransformer.findUnique({
      where: { templateId: input.metricId },
      select: { id: true, createdAt: true, updatedAt: true },
    });

    // Get chart transformer
    const dashboardChart = await db.dashboardChart.findFirst({
      where: { metricId: input.metricId },
      include: {
        chartTransformer: {
          select: { id: true, createdAt: true, updatedAt: true, chartType: true, cadence: true },
        },
      },
    });

    // Get data point count and date range
    const dataPointStats = await db.metricDataPoint.aggregate({
      where: { metricId: input.metricId },
      _count: true,
      _min: { timestamp: true },
      _max: { timestamp: true },
    });

    return {
      ingestionTransformer: ingestionTransformer
        ? {
            exists: true,
            createdAt: ingestionTransformer.createdAt,
            updatedAt: ingestionTransformer.updatedAt,
          }
        : { exists: false },
      chartTransformer: dashboardChart?.chartTransformer
        ? {
            exists: true,
            createdAt: dashboardChart.chartTransformer.createdAt,
            updatedAt: dashboardChart.chartTransformer.updatedAt,
            chartType: dashboardChart.chartTransformer.chartType,
            cadence: dashboardChart.chartTransformer.cadence,
          }
        : { exists: false },
      dataPoints: {
        count: dataPointStats._count,
        firstDate: dataPointStats._min.timestamp,
        lastDate: dataPointStats._max.timestamp,
      },
    };
  }),
```

**In drawer component:**

```typescript
const { data: transformerInfo } = api.transformer.getTransformerInfo.useQuery(
  { metricId },
  { enabled: !!metricId },
);

// Display in drawer:
{transformerInfo && (
  <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
    <p>
      Data transformer:{" "}
      {transformerInfo.ingestionTransformer.exists
        ? `Created ${formatDistanceToNow(transformerInfo.ingestionTransformer.createdAt)} ago`
        : "Not created"}
    </p>
    <p>
      Chart transformer:{" "}
      {transformerInfo.chartTransformer.exists
        ? `${transformerInfo.chartTransformer.chartType} (${transformerInfo.chartTransformer.cadence})`
        : "Not created"}
    </p>
    <p>
      Data points: {transformerInfo.dataPoints.count}
      {transformerInfo.dataPoints.firstDate && transformerInfo.dataPoints.lastDate && (
        <span className="ml-1">
          ({format(transformerInfo.dataPoints.firstDate, "MMM d")} - {format(transformerInfo.dataPoints.lastDate, "MMM d")})
        </span>
      )}
    </p>
  </div>
)}
```

---

## Files Summary

| Action | File                                                                 |
| ------ | -------------------------------------------------------------------- |
| MODIFY | `src/server/api/routers/transformer.ts` (add regenerate procedures)  |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-drawer.tsx` |

---

## Task 4: Metadata Regeneration Rules

### When ChartTransformer Regenerates (Auto)

| Trigger                          | Regenerates | Preserves                   |
| -------------------------------- | ----------- | --------------------------- |
| Hard refresh                     | Yes         | Nothing                     |
| Dimension change                 | Yes         | User overrides (if flagged) |
| Chart type change                | Yes         | User overrides              |
| User requests "Regenerate Chart" | Yes         | Nothing                     |

### When ChartTransformer Does NOT Regenerate

| Trigger                | Regenerates | Preserves                            |
| ---------------------- | ----------- | ------------------------------------ |
| Soft refresh           | No          | Everything (title, description, etc) |
| User edits title       | No          | All metadata                         |
| User edits description | No          | All metadata                         |
| Label-only updates     | No          | All metadata                         |

### User Override Handling

```typescript
// When user edits metadata, store as override:
await db.dashboardChart.update({
  where: { id: chartId },
  data: {
    chartConfig: {
      ...existingConfig,
      titleOverride: "User's Custom Title",
      descriptionOverride: "User's description",
      valueLabelOverride: "custom label",
    },
  },
});

// Display always prefers override:
const displayTitle = chartConfig.titleOverride ?? chartConfig.title;
```

### Regeneration Preserves Overrides (Optional)

If user has overrides, regeneration can optionally preserve them:

```typescript
// In regenerateChartTransformer:
const existingConfig = dashboardChart.chartConfig;
const newConfig = await generateNewChartConfig(...);

// Preserve user overrides if they exist
const finalConfig = {
  ...newConfig,
  titleOverride: existingConfig.titleOverride,
  descriptionOverride: existingConfig.descriptionOverride,
  valueLabelOverride: existingConfig.valueLabelOverride,
};
```

---

## Testing Checklist

- [ ] Regenerate ingestion transformer only → chart stays, data re-fetched
- [ ] Regenerate chart transformer only → data points preserved, new chart generated
- [ ] Manual metrics → "Regenerate Data" button disabled
- [ ] Transformer info shows correct dates
- [ ] Progress shows during regeneration
- [ ] Error handling works
- [ ] Soft refresh does NOT regenerate chart metadata
- [ ] User override persists through soft refresh
- [ ] Hard refresh regenerates title/description/valueLabel
- [ ] User override optionally preserved through hard refresh

---

## Summary: Independent Metrics + Unified Metadata

With Plan 1's changes:

| Before                                 | After                                 |
| -------------------------------------- | ------------------------------------- |
| Complex cache key logic                | Simple: always `metricId`             |
| GSheets special case                   | All metrics same                      |
| Regenerate one affects many            | Regenerate one affects one            |
| valueLabel in DataIngestionTransformer | valueLabel in ChartTransformer output |
| Multiple fallbacks for title           | Single source: chartConfig.title      |
| Separate sources for display vs goals  | Same chartConfig for both             |
