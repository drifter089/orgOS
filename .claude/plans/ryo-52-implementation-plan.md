# RYO-52: DB Ingestion Pipeline Fixes - Implementation Plan

## Summary of Changes

| Task | Description                                 | Files                                              |
| ---- | ------------------------------------------- | -------------------------------------------------- |
| 1    | GSheets per-metric transformer caching      | `data-pipeline.ts`                                 |
| 2    | Extract code cleaning utility               | New `utils.ts`, `ai-code-generator.ts`, `index.ts` |
| 3    | Extract dashboard chart verification helper | `authorization.ts`, `transformer.ts`               |
| 4    | Dev tools page + new delete procedures      | New page, `transformer.ts`                         |

---

## Task 1: GSheets Per-Metric Transformer Caching

**Problem:** GSheets transformers are cached per-templateId, but each user has different spreadsheet structure.

**Solution:** Use composite key `templateId:metricId` for GSheets templates only. No schema changes needed.

### File: `src/server/api/services/transformation/data-pipeline.ts`

**Change 1 - Line ~85 in `ingestMetricData`:**

```typescript
// BEFORE:
const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
  input.templateId,
  input.integrationId,
  template,
  apiData,
  input.endpointConfig,
);

// AFTER:
// GSheets needs per-metric transformers since each user has different spreadsheet structure
const cacheKey = input.templateId.startsWith("gsheets-")
  ? `${input.templateId}:${input.metricId}`
  : input.templateId;

const { transformer, isNew } = await getOrCreateDataIngestionTransformer(
  cacheKey,
  input.integrationId,
  template,
  apiData,
  input.endpointConfig,
);
```

**Change 2 - Line ~276 in `refreshMetricDataPoints`:**

```typescript
// BEFORE:
const transformer = await db.dataIngestionTransformer.findUnique({
  where: { templateId: input.templateId },
});

// AFTER:
// GSheets needs per-metric transformers
const cacheKey = input.templateId.startsWith("gsheets-")
  ? `${input.templateId}:${input.metricId}`
  : input.templateId;

const transformer = await db.dataIngestionTransformer.findUnique({
  where: { templateId: cacheKey },
});
```

---

## Task 2: Extract Code Cleaning Utility

**Problem:** Identical markdown code block cleaning logic repeated 3 times in `ai-code-generator.ts` (lines 174-188, 238-252, 305-320).

### File: Create `src/server/api/services/transformation/utils.ts`

````typescript
/**
 * Utility functions for transformation services
 */

/**
 * Remove markdown code block wrappers from AI-generated code.
 * AI models sometimes wrap code in ```typescript or ```js blocks.
 */
export function cleanGeneratedCode(code: string): string {
  let cleaned = code.trim();

  // Remove opening code block markers
  const openingPatterns = [
    "```typescript",
    "```ts",
    "```javascript",
    "```js",
    "```",
  ];

  for (const pattern of openingPatterns) {
    if (cleaned.startsWith(pattern)) {
      cleaned = cleaned.slice(pattern.length);
      break;
    }
  }

  // Remove closing code block marker
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }

  return cleaned.trim();
}
````

### File: `src/server/api/services/transformation/ai-code-generator.ts`

**Change 1 - Add import at top:**

```typescript
import { cleanGeneratedCode } from "./utils";
```

**Change 2 - Replace lines 172-193 in `generateDataIngestionTransformerCode`:**

```typescript
// BEFORE: 20+ lines of code block cleaning
// AFTER:
  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Generated transformer for ${input.templateId} based on actual API response structure.`,
  };
```

**Change 3 - Replace lines 236-259 in `generateChartTransformerCode`:**

```typescript
// BEFORE: 20+ lines of code block cleaning
// AFTER:
  return {
    code: cleanGeneratedCode(result.text),
    reasoning: input.userPrompt
      ? `Generated chart transformer based on user request: "${input.userPrompt}"`
      : `Generated ${input.chartType} chart transformer for ${input.metricName}.`,
  };
```

**Change 4 - Replace lines 305-327 in `regenerateDataIngestionTransformerCode`:**

```typescript
// BEFORE: 20+ lines of code block cleaning
// AFTER:
  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Regenerated transformer for ${input.templateId} after failure.`,
  };
```

### File: `src/server/api/services/transformation/index.ts`

**Add export:**

```typescript
// Utils
export { cleanGeneratedCode } from "./utils";
```

---

## Task 3: Extract Dashboard Chart Verification Helper

**Problem:** Same dashboardChart lookup + org verification repeated 4 times in `transformer.ts` (lines 108-126, 144-162, 172-189, 208-225).

### File: `src/server/api/utils/authorization.ts`

**Add new function at end of file:**

```typescript
/**
 * Get DashboardChart and verify organization ownership.
 * Throws TRPC errors if not found or access denied.
 */
export async function getDashboardChartAndVerifyAccess(
  database: DB,
  dashboardChartId: string,
  organizationId: string,
) {
  const dashboardChart = await database.dashboardChart.findUnique({
    where: { id: dashboardChartId },
  });

  if (!dashboardChart) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "DashboardChart not found",
    });
  }

  if (dashboardChart.organizationId !== organizationId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have access to this dashboard chart",
    });
  }

  return dashboardChart;
}
```

### File: `src/server/api/routers/transformer.ts`

**Change 1 - Add import:**

```typescript
import { getDashboardChartAndVerifyAccess } from "@/server/api/utils/authorization";
```

**Change 2 - Replace lines 107-126 in `createChartTransformer`:**

```typescript
.mutation(async ({ ctx, input }) => {
  const dashboardChart = await getDashboardChartAndVerifyAccess(
    db,
    input.dashboardChartId,
    ctx.workspace.organizationId,
  );

  // Fetch metric for chart creation
  const metric = await db.metric.findUnique({
    where: { id: dashboardChart.metricId },
  });

  if (!metric) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Metric not found",
    });
  }

  return createChartTransformer({
    dashboardChartId: input.dashboardChartId,
    metricName: metric.name,
    metricDescription: metric.description ?? "",
    chartType: input.chartType,
    dateRange: input.dateRange,
    aggregation: input.aggregation,
    userPrompt: input.userPrompt,
  });
}),
```

**Change 3 - Replace lines 144-164 in `getChartTransformer`:**

```typescript
.query(async ({ ctx, input }) => {
  await getDashboardChartAndVerifyAccess(
    db,
    input.dashboardChartId,
    ctx.workspace.organizationId,
  );

  return getChartTransformerByDashboardChartId(input.dashboardChartId);
}),
```

**Change 4 - Replace lines 172-193 in `executeChartTransformer`:**

```typescript
.mutation(async ({ ctx, input }) => {
  await getDashboardChartAndVerifyAccess(
    db,
    input.dashboardChartId,
    ctx.workspace.organizationId,
  );

  return executeChartTransformerForDashboardChart(input.dashboardChartId);
}),
```

**Change 5 - Replace lines 208-229 in `regenerateChartTransformer`:**

```typescript
.mutation(async ({ ctx, input }) => {
  await getDashboardChartAndVerifyAccess(
    db,
    input.dashboardChartId,
    ctx.workspace.organizationId,
  );

  return regenerateChartTransformer(input);
}),
```

---

## Task 4: Dev Tools Page + Delete Procedures

### 4.1 Add Delete Procedures to `transformer.ts`

**Add after `listChartTransformers` (around line 248):**

```typescript
  // ===========================================================================
  // Dev/Debug Procedures
  // ===========================================================================

  /**
   * Delete a DataIngestionTransformer to force regeneration
   * Used for debugging - next metric refresh will regenerate the transformer
   */
  deleteDataIngestionTransformer: workspaceProcedure
    .input(z.object({ templateId: z.string() }))
    .mutation(async ({ input }) => {
      const existing = await db.dataIngestionTransformer.findUnique({
        where: { templateId: input.templateId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "DataIngestionTransformer not found",
        });
      }

      await db.dataIngestionTransformer.delete({
        where: { templateId: input.templateId },
      });

      return { success: true, deletedId: existing.id };
    }),

  /**
   * Delete a ChartTransformer to force regeneration
   * Used for debugging - next chart refresh will regenerate the transformer
   */
  deleteChartTransformer: workspaceProcedure
    .input(z.object({ dashboardChartId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getDashboardChartAndVerifyAccess(
        db,
        input.dashboardChartId,
        ctx.workspace.organizationId,
      );

      const existing = await db.chartTransformer.findUnique({
        where: { dashboardChartId: input.dashboardChartId },
      });

      if (!existing) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "ChartTransformer not found",
        });
      }

      await db.chartTransformer.delete({
        where: { dashboardChartId: input.dashboardChartId },
      });

      return { success: true, deletedId: existing.id };
    }),
```

### 4.2 Create Dev Tools Page

**Create `src/app/dev-tools/page.tsx`:**

```typescript
import { TransformerDebugger } from "./_components/transformer-debugger";

export default function DevToolsPage() {
  return (
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <h1 className="text-3xl font-bold">Developer Tools</h1>
        <p className="text-muted-foreground mt-1">
          Debug transformers, view generated code, and trigger data refresh
        </p>
      </div>
      <TransformerDebugger />
    </div>
  );
}
```

**Create `src/app/dev-tools/_components/transformer-debugger.tsx`:**

```typescript
"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { api } from "@/trpc/react";

export function TransformerDebugger() {
  const [cronResult, setCronResult] = useState<string | null>(null);
  const [cronLoading, setCronLoading] = useState(false);

  // Queries
  const dataIngestionTransformers =
    api.transformer.listDataIngestionTransformers.useQuery();
  const chartTransformers = api.transformer.listChartTransformers.useQuery();
  const metrics = api.metric.getAll.useQuery();

  // Mutations
  const deleteDataIngestion =
    api.transformer.deleteDataIngestionTransformer.useMutation({
      onSuccess: () => {
        void dataIngestionTransformers.refetch();
      },
    });

  const deleteChart = api.transformer.deleteChartTransformer.useMutation({
    onSuccess: () => {
      void chartTransformers.refetch();
    },
  });

  const refreshMetric = api.transformer.refreshMetric.useMutation({
    onSuccess: () => {
      void dataIngestionTransformers.refetch();
      void chartTransformers.refetch();
    },
  });

  // Trigger cron manually
  const triggerCron = async () => {
    setCronLoading(true);
    try {
      const response = await fetch("/api/cron/poll-metrics", {
        method: "POST",
      });
      const data = await response.json();
      setCronResult(JSON.stringify(data, null, 2));
      void dataIngestionTransformers.refetch();
      void chartTransformers.refetch();
    } catch (error) {
      setCronResult(
        `Error: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    } finally {
      setCronLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cron Trigger */}
      <Card>
        <CardHeader>
          <CardTitle>Cron Job</CardTitle>
          <CardDescription>
            Manually trigger the metric polling cron job
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={triggerCron} disabled={cronLoading}>
            {cronLoading ? "Running..." : "Trigger Cron Now"}
          </Button>
          {cronResult && (
            <pre className="bg-muted overflow-auto rounded p-4 text-sm">
              {cronResult}
            </pre>
          )}
        </CardContent>
      </Card>

      {/* Data Ingestion Transformers */}
      <Card>
        <CardHeader>
          <CardTitle>Data Ingestion Transformers</CardTitle>
          <CardDescription>
            AI-generated code that transforms API responses into DataPoints.
            Shared across orgs (except GSheets which are per-metric).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dataIngestionTransformers.isLoading ? (
            <p>Loading...</p>
          ) : dataIngestionTransformers.data?.length === 0 ? (
            <p className="text-muted-foreground">No transformers found</p>
          ) : (
            <div className="space-y-4">
              {dataIngestionTransformers.data?.map((t) => (
                <Collapsible key={t.id}>
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <CollapsibleTrigger className="font-mono text-sm hover:underline">
                        {t.templateId}
                      </CollapsibleTrigger>
                      <p className="text-muted-foreground text-xs">
                        Updated: {new Date(t.updatedAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteDataIngestion.mutate({ templateId: t.templateId })
                      }
                      disabled={deleteDataIngestion.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <pre className="bg-muted mt-2 overflow-auto rounded p-4 text-xs">
                      {t.transformerCode}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chart Transformers */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Transformers</CardTitle>
          <CardDescription>
            AI-generated code that transforms DataPoints into chart configs.
            One per dashboard chart.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {chartTransformers.isLoading ? (
            <p>Loading...</p>
          ) : chartTransformers.data?.length === 0 ? (
            <p className="text-muted-foreground">No chart transformers found</p>
          ) : (
            <div className="space-y-4">
              {chartTransformers.data?.map((t) => (
                <Collapsible key={t.id}>
                  <div className="flex items-center justify-between rounded border p-3">
                    <div>
                      <CollapsibleTrigger className="font-mono text-sm hover:underline">
                        {t.dashboardChart.metric.name}
                      </CollapsibleTrigger>
                      <p className="text-muted-foreground text-xs">
                        Type: {t.chartType} | Range: {t.dateRange} | v
                        {t.version}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() =>
                        deleteChart.mutate({
                          dashboardChartId: t.dashboardChartId,
                        })
                      }
                      disabled={deleteChart.isPending}
                    >
                      Delete
                    </Button>
                  </div>
                  <CollapsibleContent>
                    <pre className="bg-muted mt-2 overflow-auto rounded p-4 text-xs">
                      {t.transformerCode}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metrics with Refresh */}
      <Card>
        <CardHeader>
          <CardTitle>Metrics</CardTitle>
          <CardDescription>
            Manually refresh metrics to fetch new data and regenerate
            transformers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {metrics.isLoading ? (
            <p>Loading...</p>
          ) : metrics.data?.length === 0 ? (
            <p className="text-muted-foreground">No metrics found</p>
          ) : (
            <div className="space-y-2">
              {metrics.data?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded border p-3"
                >
                  <div>
                    <p className="font-medium">{m.name}</p>
                    <p className="text-muted-foreground text-xs">
                      Template: {m.templateId ?? "none"} | Last fetched:{" "}
                      {m.lastFetchedAt
                        ? new Date(m.lastFetchedAt).toLocaleString()
                        : "never"}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshMetric.mutate({ metricId: m.id })}
                    disabled={refreshMetric.isPending}
                  >
                    Refresh
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## Execution Order

1. **Task 2** - Create `utils.ts` and update `ai-code-generator.ts` (no dependencies)
2. **Task 3** - Add helper to `authorization.ts` and update `transformer.ts` (no dependencies)
3. **Task 1** - Update `data-pipeline.ts` for GSheets caching (no dependencies)
4. **Task 4** - Add delete procedures to `transformer.ts`, create dev tools page (depends on Task 3)

---

## Files Summary

| Action | File                                                          |
| ------ | ------------------------------------------------------------- |
| CREATE | `src/server/api/services/transformation/utils.ts`             |
| CREATE | `src/app/dev-tools/page.tsx`                                  |
| CREATE | `src/app/dev-tools/_components/transformer-debugger.tsx`      |
| MODIFY | `src/server/api/services/transformation/ai-code-generator.ts` |
| MODIFY | `src/server/api/services/transformation/index.ts`             |
| MODIFY | `src/server/api/services/transformation/data-pipeline.ts`     |
| MODIFY | `src/server/api/utils/authorization.ts`                       |
| MODIFY | `src/server/api/routers/transformer.ts`                       |
