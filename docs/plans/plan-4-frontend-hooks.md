# Plan 4: Frontend Hooks & Progress UI

## Overview

- **Can Start**: After Plan 1 (needs getProgress endpoint)
- **Depends On**: Plan 1
- **Enables**: Plan 6

## Goals

1. Create reusable optimistic mutation hook
2. Create metric-specific mutations hook
3. Create pipeline progress polling hook
4. Create progress UI component
5. Reduce boilerplate in metric operations

---

## Task 1: Create Generic Optimistic Mutation Hook

**File**: `src/hooks/use-optimistic-mutation.ts`

```typescript
import {
  type QueryKey,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

export interface OptimisticMutationConfig<TData, TVariables, TContext> {
  /** The mutation function */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /** Query keys to cancel before mutation */
  queryKeysToCancel?: QueryKey[];

  /** Called before mutation - return context for rollback */
  onMutate: (variables: TVariables) => Promise<TContext>;

  /** Called on success - update cache with real data */
  onSuccess?: (data: TData, variables: TVariables, context: TContext) => void;

  /** Called on error - rollback using context */
  onError?: (error: Error, variables: TVariables, context: TContext) => void;

  /** Query keys to invalidate after mutation settles */
  queryKeysToInvalidate?: QueryKey[];
}

export function useOptimisticMutation<TData, TVariables, TContext>(
  config: OptimisticMutationConfig<TData, TVariables, TContext>,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: config.mutationFn,

    onMutate: async (variables) => {
      // Cancel in-flight queries to prevent race conditions
      if (config.queryKeysToCancel) {
        await Promise.all(
          config.queryKeysToCancel.map((key) =>
            queryClient.cancelQueries({ queryKey: key }),
          ),
        );
      }

      return config.onMutate(variables);
    },

    onSuccess: (data, variables, context) => {
      if (context && config.onSuccess) {
        config.onSuccess(data, variables, context);
      }
    },

    onError: (error, variables, context) => {
      if (context && config.onError) {
        config.onError(error as Error, variables, context);
      }
    },

    onSettled: () => {
      // Invalidate to refetch fresh data
      if (config.queryKeysToInvalidate) {
        config.queryKeysToInvalidate.forEach((key) => {
          void queryClient.invalidateQueries({ queryKey: key });
        });
      }
    },
  });
}
```

---

## Task 2: Create Metric Mutations Hook

**File**: `src/hooks/use-metric-mutations.ts`

```typescript
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

import { useOptimisticMutation } from "./use-optimistic-mutation";

interface UseMetricMutationsOptions {
  teamId?: string;
}

export function useMetricMutations({ teamId }: UseMetricMutationsOptions = {}) {
  const utils = api.useUtils();

  // Cache keys
  const dashboardKey = ["dashboard", "getDashboardCharts"] as const;
  const dashboardTeamKey = teamId
    ? (["dashboard", "getDashboardCharts", { teamId }] as const)
    : null;

  /**
   * Create metric with optimistic update
   */
  const create = useOptimisticMutation({
    mutationFn: api.metric.create.mutate,

    queryKeysToCancel: [
      dashboardKey,
      ...(dashboardTeamKey ? [dashboardTeamKey] : []),
    ],

    onMutate: async (variables) => {
      const tempId = `temp-${Date.now()}`;

      // Build optimistic chart
      const optimisticChart: Partial<DashboardChartWithRelations> = {
        id: tempId,
        metricId: tempId,
        chartType: "line",
        chartConfig: {},
        position: 0,
        metric: {
          id: tempId,
          name: variables.name,
          description: variables.description ?? null,
          refreshStatus: "fetching-api-data",
        } as any,
      };

      // Save previous data
      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : null;

      // Add optimistic chart
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old
          ? [...old, optimisticChart as DashboardChartWithRelations]
          : [optimisticChart as DashboardChartWithRelations],
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old
            ? [...old, optimisticChart as DashboardChartWithRelations]
            : [optimisticChart as DashboardChartWithRelations],
        );
      }

      return { tempId, previousData, previousTeamData };
    },

    onSuccess: (data, _variables, context) => {
      // Swap temp with real chart
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.map((chart) => (chart.id === context.tempId ? data : chart)),
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.map((chart) => (chart.id === context.tempId ? data : chart)),
        );
      }
    },

    onError: (_error, _variables, context) => {
      // Rollback
      if (context.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          undefined,
          context.previousData,
        );
      }
      if (teamId && context.previousTeamData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousTeamData,
        );
      }
    },

    queryKeysToInvalidate: [dashboardKey],
  });

  /**
   * Delete metric with optimistic update
   */
  const deleteMutation = useOptimisticMutation({
    mutationFn: api.metric.delete.mutate,

    queryKeysToCancel: [dashboardKey],

    onMutate: async (variables) => {
      const previousData = utils.dashboard.getDashboardCharts.getData();
      const previousTeamData = teamId
        ? utils.dashboard.getDashboardCharts.getData({ teamId })
        : null;

      // Remove optimistically
      utils.dashboard.getDashboardCharts.setData(undefined, (old) =>
        old?.filter((chart) => chart.metric.id !== variables.id),
      );

      if (teamId) {
        utils.dashboard.getDashboardCharts.setData({ teamId }, (old) =>
          old?.filter((chart) => chart.metric.id !== variables.id),
        );
      }

      return { previousData, previousTeamData };
    },

    onError: (_error, _variables, context) => {
      if (context.previousData) {
        utils.dashboard.getDashboardCharts.setData(
          undefined,
          context.previousData,
        );
      }
      if (teamId && context.previousTeamData) {
        utils.dashboard.getDashboardCharts.setData(
          { teamId },
          context.previousTeamData,
        );
      }
    },

    queryKeysToInvalidate: [dashboardKey],
  });

  /**
   * Refresh metric (no optimistic update needed)
   */
  const refresh = api.metric.refresh.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  /**
   * Regenerate metric (hard refresh)
   */
  const regenerate = api.metric.regenerate.useMutation({
    onSuccess: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
    },
  });

  return {
    create,
    delete: deleteMutation,
    refresh,
    regenerate,
  };
}
```

---

## Task 3: Create Pipeline Progress Hook

**File**: `src/hooks/use-pipeline-progress.ts`

```typescript
import { api } from "@/trpc/react";

interface UsePipelineProgressOptions {
  metricId: string;
  enabled?: boolean;
  pollInterval?: number;
}

export interface PipelineProgressState {
  isProcessing: boolean;
  currentStep: string | null;
  completedSteps: Array<{
    step: string;
    displayName: string;
    status: "completed" | "failed";
    durationMs?: number;
  }>;
  totalSteps: number;
  progressPercent: number;
  error: string | null;
}

// Map step names to display names
const STEP_DISPLAY_NAMES: Record<string, string> = {
  "fetching-api-data": "Fetching data...",
  "deleting-old-data": "Clearing old data...",
  "generating-ingestion-transformer": "Generating transformer...",
  "executing-ingestion-transformer": "Processing data...",
  "saving-timeseries-data": "Saving data...",
  "generating-chart-transformer": "Generating chart...",
  "executing-chart-transformer": "Creating visualization...",
  "saving-chart-config": "Finalizing...",
};

export function usePipelineProgress({
  metricId,
  enabled = true,
  pollInterval = 500,
}: UsePipelineProgressOptions): PipelineProgressState {
  const { data } = api.metric.getProgress.useQuery(
    { metricId },
    {
      enabled,
      refetchInterval: enabled ? pollInterval : false,
    },
  );

  if (!data?.isProcessing) {
    return {
      isProcessing: false,
      currentStep: null,
      completedSteps: [],
      totalSteps: 0,
      progressPercent: 0,
      error: data?.error ?? null,
    };
  }

  const completedSteps = data.completedSteps ?? [];
  const totalSteps = Math.max(completedSteps.length + 1, 7); // Estimate total

  return {
    isProcessing: true,
    currentStep: data.currentStep,
    completedSteps: completedSteps.map((step) => ({
      ...step,
      displayName:
        STEP_DISPLAY_NAMES[step.step] ?? step.displayName ?? step.step,
    })),
    totalSteps,
    progressPercent: Math.round((completedSteps.length / totalSteps) * 100),
    error: null,
  };
}
```

---

## Task 4: Create Pipeline Progress UI Component

**File**: `src/components/pipeline-progress.tsx`

```typescript
"use client";

import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { usePipelineProgress } from "@/hooks/use-pipeline-progress";

interface PipelineProgressProps {
  metricId: string;
  isActive: boolean;
  variant?: "minimal" | "compact" | "detailed";
}

export function PipelineProgress({
  metricId,
  isActive,
  variant = "compact",
}: PipelineProgressProps) {
  const progress = usePipelineProgress({
    metricId,
    enabled: isActive,
  });

  if (!progress.isProcessing) {
    return null;
  }

  // Minimal: just a spinner with current step
  if (variant === "minimal") {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>{progress.currentStep ? STEP_DISPLAY_NAMES[progress.currentStep] : "Processing..."}</span>
      </div>
    );
  }

  // Compact: progress bar with current step
  if (variant === "compact") {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {progress.currentStep ? STEP_DISPLAY_NAMES[progress.currentStep] : "Processing..."}
          </span>
          <span className="text-muted-foreground">{progress.progressPercent}%</span>
        </div>
        <Progress value={progress.progressPercent} className="h-1.5" />
      </div>
    );
  }

  // Detailed: show all steps with checkmarks
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">
          {progress.currentStep ? STEP_DISPLAY_NAMES[progress.currentStep] : "Processing..."}
        </span>
        <span className="text-muted-foreground">{progress.progressPercent}%</span>
      </div>

      <Progress value={progress.progressPercent} className="h-2" />

      <div className="space-y-1 text-sm">
        {progress.completedSteps.map((step) => (
          <div
            key={step.step}
            className={cn(
              "flex items-center gap-2",
              step.status === "completed" && "text-green-600",
              step.status === "failed" && "text-destructive"
            )}
          >
            {step.status === "completed" ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span>{step.displayName}</span>
            {step.durationMs && (
              <span className="text-muted-foreground text-xs">
                ({(step.durationMs / 1000).toFixed(1)}s)
              </span>
            )}
          </div>
        ))}

        {progress.currentStep && (
          <div className="flex items-center gap-2 text-primary font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{STEP_DISPLAY_NAMES[progress.currentStep] ?? progress.currentStep}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// Step display name mapping
const STEP_DISPLAY_NAMES: Record<string, string> = {
  "fetching-api-data": "Fetching data from API",
  "deleting-old-data": "Clearing old data",
  "generating-ingestion-transformer": "Generating data transformer",
  "executing-ingestion-transformer": "Processing API response",
  "saving-timeseries-data": "Saving metric data",
  "generating-chart-transformer": "Generating chart configuration",
  "executing-chart-transformer": "Creating visualization",
  "saving-chart-config": "Finalizing",
};
```

---

## Task 5: Update MetricDialogBase to Use New Hook

**File**: `src/app/metric/_components/base/MetricDialogBase.tsx`

Replace manual optimistic logic:

```typescript
// After:
import { useMetricMutations } from "@/hooks/use-metric-mutations";

// Before (remove):
const { cancelQueries, addOptimisticChart, swapTempWithReal, rollback } =
  useOptimisticMetricUpdate({ teamId });

const { create } = useMetricMutations({ teamId });

// In handleSubmit:
const handleSubmit = async (data: MetricCreateInput) => {
  try {
    const result = await create.mutateAsync(data);
    // Show goal setup step with real result
    setCreatedMetricId(result.metric.id);
    setStep("goal");
  } catch (error) {
    // Error handled by mutation
    toast.error("Failed to create metric");
  }
};
```

---

## Task 6: Update Dashboard Metric Card

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx`

Replace manual mutation logic with hook:

```typescript
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { PipelineProgress } from "@/components/pipeline-progress";

// In component:
const { delete: deleteMutation, refresh, regenerate } = useMetricMutations({ teamId });

// Detect if processing
const isProcessing = dashboardMetric.metric.refreshStatus !== null;
const metricId = dashboardMetric.metric.id;

// In JSX, add progress display:
{isProcessing && (
  <div className="p-4 border-t">
    <PipelineProgress
      metricId={metricId}
      isActive={isProcessing}
      variant="compact"
    />
  </div>
)}

// Replace manual delete handler:
const handleDelete = () => {
  deleteMutation.mutate({ id: metricId });
};

// Replace manual refresh handler:
const handleRefresh = () => {
  refresh.mutate({ metricId });
};
```

---

## Task 7: Deprecate Old Hook

**File**: `src/hooks/use-optimistic-metric-update.ts`

Add deprecation notice:

```typescript
/**
 * @deprecated Use useMetricMutations from '@/hooks/use-metric-mutations' instead.
 * This hook will be removed in a future version.
 */
export function useOptimisticMetricUpdate({ teamId }: { teamId?: string }) {
  console.warn(
    "useOptimisticMetricUpdate is deprecated. Use useMetricMutations instead.",
  );
  // ... existing implementation for backward compatibility
}
```

---

## Files Summary

| Action | File                                                               |
| ------ | ------------------------------------------------------------------ |
| CREATE | `src/hooks/use-optimistic-mutation.ts`                             |
| CREATE | `src/hooks/use-metric-mutations.ts`                                |
| CREATE | `src/hooks/use-pipeline-progress.ts`                               |
| CREATE | `src/components/pipeline-progress.tsx`                             |
| MODIFY | `src/app/metric/_components/base/MetricDialogBase.tsx`             |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-card.tsx` |
| MODIFY | `src/hooks/use-optimistic-metric-update.ts` (deprecate)            |

---

## Testing Checklist

- [ ] Create metric → optimistic chart appears instantly
- [ ] Create metric → pipeline progress shows real-time steps
- [ ] Create metric fails → chart removed, error shown
- [ ] Delete metric → instant removal from list
- [ ] Delete metric fails → chart restored
- [ ] Refresh metric → progress shows in card
- [ ] Regenerate metric → shows "deleting old data" step
- [ ] Multiple cards refreshing → each shows own progress
