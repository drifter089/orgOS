# Plan 5: Router Split

## Overview

- **Can Start**: After Plan 1 (needs pipeline concepts)
- **Depends On**: Plan 1
- **Enables**: Nothing (independent)

## Goals

1. Split 821-line `metric.ts` into focused routers
2. Extract goal operations to `goal.ts`
3. Extract manual metric operations to `manual-metric.ts`
4. Extract pipeline operations to `pipeline.ts`
5. Keep `metric.ts` for CRUD only

---

## Task 1: Create Goal Router

**File**: `src/server/api/routers/goal.ts`

```typescript
import { z } from "zod";

import {
  calculateGoalProgress,
  calculateTargetDisplayValue,
} from "@/lib/goals";
import type { ChartDataForGoal } from "@/lib/goals";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";

export const goalRouter = createTRPCRouter({
  /**
   * Get goal for a metric with progress calculation
   */
  get: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
        include: { chartTransformer: true },
      });

      if (!metric.goal) {
        return {
          goal: null,
          progress: null,
          cadence: dashboardChart?.chartTransformer?.cadence ?? null,
        };
      }

      const cadence = dashboardChart?.chartTransformer?.cadence;
      const chartConfig =
        dashboardChart?.chartConfig as ChartDataForGoal | null;

      if (!cadence || !chartConfig) {
        return {
          goal: metric.goal,
          progress: null,
          cadence: null,
        };
      }

      const progress = calculateGoalProgress(
        {
          goalType: metric.goal.goalType,
          targetValue: metric.goal.targetValue,
          baselineValue: metric.goal.baselineValue,
          baselineTimestamp: metric.goal.baselineTimestamp,
          onTrackThreshold: metric.goal.onTrackThreshold,
        },
        cadence,
        chartConfig,
      );

      return {
        goal: metric.goal,
        progress,
        cadence,
      };
    }),

  /**
   * Create or update goal
   */
  upsert: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        goalType: z.enum(["ABSOLUTE", "RELATIVE"]),
        targetValue: z.number().positive(),
        onTrackThreshold: z.number().min(0).max(100).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Check if goal exists
      const existingGoal = await ctx.db.metricGoal.findUnique({
        where: { metricId: input.metricId },
      });

      if (existingGoal) {
        // Update - don't change baseline
        return ctx.db.metricGoal.update({
          where: { metricId: input.metricId },
          data: {
            goalType: input.goalType,
            targetValue: input.targetValue,
            onTrackThreshold: input.onTrackThreshold,
          },
        });
      }

      // Create new - capture baseline
      const dashboardChart = await ctx.db.dashboardChart.findFirst({
        where: { metricId: input.metricId },
      });

      let baselineValue: number | null = null;
      let baselineTimestamp: Date | null = null;

      if (dashboardChart?.chartConfig) {
        const chartConfig = dashboardChart.chartConfig as ChartDataForGoal;
        const lastPoint =
          chartConfig.chartData?.[chartConfig.chartData.length - 1];
        const dataKey = chartConfig.dataKeys?.[0];

        if (lastPoint && dataKey) {
          const value = lastPoint[dataKey];
          if (typeof value === "number") {
            baselineValue = value;
            baselineTimestamp = new Date();
          }
        }
      }

      return ctx.db.metricGoal.create({
        data: {
          metricId: input.metricId,
          goalType: input.goalType,
          targetValue: input.targetValue,
          baselineValue,
          baselineTimestamp,
          onTrackThreshold: input.onTrackThreshold,
        },
      });
    }),

  /**
   * Delete goal
   */
  delete: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      return ctx.db.metricGoal.delete({
        where: { metricId: input.metricId },
      });
    }),
});
```

---

## Task 2: Create Manual Metric Router

**File**: `src/server/api/routers/manual-metric.ts`

```typescript
import { z } from "zod";

import {
  createTRPCRouter,
  protectedProcedure,
  workspaceProcedure,
} from "@/server/api/trpc";
import {
  getMetricAndVerifyAccess,
  getTeamAndVerifyAccess,
} from "@/server/api/utils/authorization";

export const manualMetricRouter = createTRPCRouter({
  /**
   * Create manual metric (no integration)
   */
  create: workspaceProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        teamId: z.string().optional(),
        unitType: z.enum(["number", "percentage"]),
        cadence: z.enum(["daily", "weekly", "monthly"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.teamId) {
        await getTeamAndVerifyAccess(
          ctx.db,
          input.teamId,
          ctx.user.id,
          ctx.workspace,
        );
      }

      const metric = await ctx.db.metric.create({
        data: {
          name: input.name,
          description: input.description,
          organizationId: ctx.workspace.organizationId,
          teamId: input.teamId,
          integrationId: null,
          templateId: null,
          endpointConfig: {
            type: "manual",
            unitType: input.unitType,
            cadence: input.cadence,
          },
          pollFrequency: "manual",
          nextPollAt: null,
        },
      });

      const dashboardChart = await ctx.db.dashboardChart.create({
        data: {
          metricId: metric.id,
          organizationId: ctx.workspace.organizationId,
          chartType: "line",
          chartConfig: {},
          position: 0,
        },
      });

      return { metric, dashboardChart };
    }),

  /**
   * Add data points to manual metric
   */
  addDataPoints: workspaceProcedure
    .input(
      z.object({
        metricId: z.string(),
        dataPoints: z.array(
          z.object({
            timestamp: z.date(),
            value: z.number(),
          }),
        ),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const metric = await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      if (metric.integrationId !== null) {
        throw new Error("Can only add data points to manual metrics");
      }

      // Upsert data points
      await ctx.db.$transaction(
        input.dataPoints.map((dp) =>
          ctx.db.metricDataPoint.upsert({
            where: {
              metricId_timestamp: {
                metricId: input.metricId,
                timestamp: dp.timestamp,
              },
            },
            create: {
              metricId: input.metricId,
              timestamp: dp.timestamp,
              value: dp.value,
              dimensions: null,
            },
            update: { value: dp.value },
          }),
        ),
      );

      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { lastFetchedAt: new Date() },
      });

      return { success: true };
    }),

  /**
   * Update chart for manual metric
   */
  updateChart: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Get data points
      const dataPoints = await ctx.db.metricDataPoint.findMany({
        where: { metricId: input.metricId },
        orderBy: { timestamp: "asc" },
      });

      if (dataPoints.length === 0) {
        return { success: true, message: "No data points" };
      }

      // Regenerate chart config from data points
      // ... (existing chart update logic)

      return { success: true };
    }),
});
```

---

## Task 3: Create Pipeline Router

**File**: `src/server/api/routers/pipeline.ts`

```typescript
import { z } from "zod";

import { refreshMetricAndCharts } from "@/server/api/services/transformation/data-pipeline";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getMetricAndVerifyAccess } from "@/server/api/utils/authorization";

export const pipelineRouter = createTRPCRouter({
  /**
   * Refresh metric (soft refresh - reuse transformers)
   */
  refresh: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Use refreshMetricAndCharts from Plan 1 with forceRegenerate: false
      const result = await refreshMetricAndCharts({
        metricId: input.metricId,
        forceRegenerate: false, // Soft refresh - reuse existing transformers
      });

      if (!result.success) {
        // Don't throw - return error info so frontend can show "Regenerate" button
        return {
          success: false,
          error: result.error,
          suggestHardRefresh: result.error?.includes("Transformer not found"),
        };
      }

      return { success: true };
    }),

  /**
   * Regenerate metric (hard refresh - delete old data + regenerate transformers)
   */
  regenerate: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

      // Use refreshMetricAndCharts from Plan 1 with forceRegenerate: true
      const result = await refreshMetricAndCharts({
        metricId: input.metricId,
        forceRegenerate: true, // Hard refresh - delete all and regenerate
      });

      if (!result.success) {
        return {
          success: false,
          error: result.error,
        };
      }

      return { success: true };
    }),

  /**
   * Get pipeline progress for frontend polling
   */
  getProgress: workspaceProcedure
    .input(z.object({ metricId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify access first
      await getMetricAndVerifyAccess(
        ctx.db,
        input.metricId,
        ctx.workspace.organizationId,
      );

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

      // Get recent pipeline logs
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
});
```

---

## Task 4: Update Root Router

**File**: `src/server/api/root.ts`

**IMPORTANT**: This task REMOVES the existing `transformer` router. Plan 7 will create a NEW `transformer.ts` with different procedures. The old `transformer.ts` procedures are migrated as follows:

| Old Procedure                            | New Location                                          |
| ---------------------------------------- | ----------------------------------------------------- |
| `transformer.refreshMetric`              | `pipeline.refresh/regenerate`                         |
| `transformer.createChartTransformer`     | Removed (called internally)                           |
| `transformer.regenerateChartTransformer` | `transformer.regenerateChartTransformerOnly` (Plan 7) |
| `transformer.updateManualChart`          | `manualMetric.updateChart`                            |

```typescript
import { goalRouter } from "./routers/goal";
import { manualMetricRouter } from "./routers/manual-metric";
import { pipelineRouter } from "./routers/pipeline";

// REMOVE: import { transformerRouter } from "./routers/transformer";

// ... other imports

export const appRouter = createTRPCRouter({
  // Existing routers
  metric: metricRouter,
  dashboard: dashboardRouter,
  // REMOVE: transformer: transformerRouter,
  // ... etc

  // New routers
  goal: goalRouter,
  manualMetric: manualMetricRouter,
  pipeline: pipelineRouter,
  // transformer will be re-added in Plan 7 with new procedures
});
```

**DELETE FILE**: `src/server/api/routers/transformer.ts` (will be recreated in Plan 7)

---

## Task 5: Clean Up metric.ts

**File**: `src/server/api/routers/metric.ts`

Remove extracted code. Keep only:

```typescript
export const metricRouter = createTRPCRouter({
  // CRUD Operations
  getAll,
  getById,
  getByTeamId,
  create,
  update,
  delete: deleteMetric,

  // Keep for backward compatibility (delegate to new routers)
  getRefreshStatus: protectedProcedure
    .input(z.object({ metricId: z.string() }))
    .query(({ ctx, input }) => {
      // Delegate to pipeline.getProgress
      return ctx.db.metric.findUnique({
        where: { id: input.metricId },
        select: { refreshStatus: true },
      });
    }),

  // Integration data fetching (keep here)
  fetchIntegrationData,
});
```

---

## Task 6: Update Frontend Imports

Files to update:

**`src/components/metric/goal-editor.tsx`**:

```typescript
// Before:
api.metric.getGoal.useQuery({ metricId });
api.metric.upsertGoal.useMutation();
api.metric.deleteGoal.useMutation();

// After:
api.goal.get.useQuery({ metricId });
api.goal.upsert.useMutation();
api.goal.delete.useMutation();
```

**`src/app/metric/_components/manual/ManualMetricContent.tsx`**:

```typescript
// Before:
api.metric.createManual.useMutation();

// After:
api.manualMetric.create.useMutation();
```

**`src/app/metric/_components/base-metric-check-in-form.tsx`**:

```typescript
// Before:
api.metric.addDataPoints.useMutation();

// After:
api.manualMetric.addDataPoints.useMutation();
```

**`src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx`**:

```typescript
// Before:
api.metric.refresh.useMutation();
api.metric.getRefreshStatus.useQuery();

// After:
api.pipeline.refresh.useMutation();
api.pipeline.getProgress.useQuery();
```

---

## Files Summary

| Action | File                                                               |
| ------ | ------------------------------------------------------------------ |
| CREATE | `src/server/api/routers/goal.ts`                                   |
| CREATE | `src/server/api/routers/manual-metric.ts`                          |
| CREATE | `src/server/api/routers/pipeline.ts`                               |
| DELETE | `src/server/api/routers/transformer.ts` (recreated in Plan 7)      |
| MODIFY | `src/server/api/root.ts`                                           |
| MODIFY | `src/server/api/routers/metric.ts` (remove extracted code)         |
| MODIFY | `src/components/metric/goal-editor.tsx`                            |
| MODIFY | `src/app/metric/_components/manual/ManualMetricContent.tsx`        |
| MODIFY | `src/app/metric/_components/base-metric-check-in-form.tsx`         |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx` |

---

## Testing Checklist

- [ ] Goal get/upsert/delete work via new router
- [ ] Manual metric create works via new router
- [ ] Manual metric addDataPoints works
- [ ] Pipeline refresh/regenerate work
- [ ] Pipeline getProgress returns correct data
- [ ] All frontend components use new router paths
- [ ] No TypeScript errors
