# Plan 2: Goal System Refactor + Goal Line on Chart

## Overview

- **Can Start**: Immediately (no dependencies)
- **Parallel With**: Plan 1, Plan 3, Plan 7
- **Enables**: Nothing (independent)

## Goals

1. Split 467-line `goal-calculation.ts` into focused modules
2. **Add goal target line on chart display**
3. Improve goal progress calculation readability
4. **Use ChartTransformer data as single source of truth**

---

## IMPORTANT: ChartTransformer as Source of Truth

Goal calculation now uses **ChartTransformer output** exclusively:

| Data Source              | Used For                       |
| ------------------------ | ------------------------------ |
| `chartConfig.chartData`  | Current value, baseline, trend |
| `chartConfig.dataKeys`   | Which field to track           |
| `chartConfig.valueLabel` | Display label for goal values  |
| `chartConfig.title`      | Goal display context           |

This ensures:

- **Consistency**: Goal values match what user sees on chart
- **No fallbacks**: Single source eliminates confusion
- **Per-metric**: Each metric's goal uses its own chartConfig

---

## Task 1: Create Goal Types

**File**: `src/lib/goals/types.ts`

```typescript
export type Cadence = "DAILY" | "WEEKLY" | "MONTHLY";
export type GoalType = "ABSOLUTE" | "RELATIVE";
export type GoalStatus =
  | "exceeded"
  | "on_track"
  | "behind"
  | "at_risk"
  | "no_data"
  | "invalid_baseline";
export type Trend = "accelerating" | "stable" | "decelerating" | "unknown";

export interface PeriodBounds {
  periodStart: Date;
  periodEnd: Date;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;
  hoursRemaining: number; // For DAILY cadence display
}

export interface ProgressResult {
  progressPercent: number;
  expectedProgressPercent: number;
  growthPercent?: number; // For RELATIVE goals only
}

export interface TrendResult {
  trend: Trend;
  projectedEndValue: number | null;
  isDecline: boolean;
}

export interface GoalProgress extends PeriodBounds {
  cadence: Cadence;
  baselineValue: number | null;
  currentValue: number | null;
  targetValue: number;
  targetDisplayValue: number; // For RELATIVE: calculated absolute target
  progressPercent: number;
  expectedProgressPercent: number;
  growthPercent?: number;
  status: GoalStatus;
  trend: Trend;
  projectedEndValue: number | null;
  isDecline: boolean;
}

export interface GoalInput {
  goalType: GoalType;
  targetValue: number;
  baselineValue: number | null;
  baselineTimestamp: Date | null;
  onTrackThreshold: number | null;
}

export interface ChartDataForGoal {
  chartData: Array<Record<string, unknown>>;
  xAxisKey: string;
  dataKeys: string[];
}
```

---

## Task 2: Create Period Bounds Module

**File**: `src/lib/goals/period-bounds.ts`

```typescript
import type { Cadence, PeriodBounds } from "./types";

/**
 * Get period start/end dates for given cadence
 */
export function getPeriodBounds(cadence: Cadence): PeriodBounds {
  const now = new Date();

  switch (cadence) {
    case "DAILY":
      return getDailyBounds(now);
    case "WEEKLY":
      return getWeeklyBounds(now);
    case "MONTHLY":
      return getMonthlyBounds(now);
  }
}

function getDailyBounds(now: Date): PeriodBounds {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 1);
  periodEnd.setUTCMilliseconds(-1);

  return buildBounds(periodStart, periodEnd, now, 1);
}

function getWeeklyBounds(now: Date): PeriodBounds {
  // Monday = start of week (ISO standard)
  const dayOfWeek = now.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const periodStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - daysToMonday,
    ),
  );

  const periodEnd = new Date(periodStart);
  periodEnd.setUTCDate(periodEnd.getUTCDate() + 7);
  periodEnd.setUTCMilliseconds(-1);

  return buildBounds(periodStart, periodEnd, now, 7);
}

function getMonthlyBounds(now: Date): PeriodBounds {
  const periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  // Last day of month
  const periodEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  const daysTotal = periodEnd.getUTCDate();
  return buildBounds(periodStart, periodEnd, now, daysTotal);
}

function buildBounds(
  periodStart: Date,
  periodEnd: Date,
  now: Date,
  daysTotal: number,
): PeriodBounds {
  const msPerDay = 24 * 60 * 60 * 1000;
  const msPerHour = 60 * 60 * 1000;

  const msElapsed = now.getTime() - periodStart.getTime();
  const msRemaining = Math.max(0, periodEnd.getTime() - now.getTime());

  return {
    periodStart,
    periodEnd,
    daysElapsed: Math.min(daysTotal, msElapsed / msPerDay),
    daysTotal,
    daysRemaining: msRemaining / msPerDay,
    hoursRemaining: msRemaining / msPerHour,
  };
}
```

---

## Task 3: Create Progress Calculator

**File**: `src/lib/goals/progress-calculator.ts`

```typescript
import type { GoalStatus, GoalType, ProgressResult } from "./types";

const DEFAULT_THRESHOLD = 0.8; // 80%

/**
 * Calculate progress for ABSOLUTE goal
 */
export function calculateAbsoluteProgress(
  currentValue: number,
  targetValue: number,
): ProgressResult {
  if (targetValue === 0) {
    return {
      progressPercent: currentValue > 0 ? 100 : 0,
      expectedProgressPercent: 100,
    };
  }

  return {
    progressPercent: Math.max(0, (currentValue / targetValue) * 100),
    expectedProgressPercent: 100,
  };
}

/**
 * Calculate progress for RELATIVE goal (% growth from baseline)
 */
export function calculateRelativeProgress(
  currentValue: number,
  baselineValue: number,
  targetGrowthPercent: number,
): ProgressResult {
  if (baselineValue === 0) {
    return {
      progressPercent: 0,
      expectedProgressPercent: 100,
      growthPercent: 0,
    };
  }

  const actualGrowthPercent =
    ((currentValue - baselineValue) / baselineValue) * 100;

  const progressPercent =
    targetGrowthPercent !== 0
      ? Math.max(0, (actualGrowthPercent / targetGrowthPercent) * 100)
      : 0;

  return {
    progressPercent,
    expectedProgressPercent: 100,
    growthPercent: actualGrowthPercent,
  };
}

/**
 * Determine goal status based on progress vs expected
 */
export function determineStatus(
  progressPercent: number,
  expectedProgressPercent: number,
  threshold: number | null,
): GoalStatus {
  const t = threshold ?? DEFAULT_THRESHOLD;
  const expectedAtThreshold = expectedProgressPercent * t;

  if (progressPercent >= 100) return "exceeded";
  if (progressPercent >= expectedAtThreshold) return "on_track";
  if (progressPercent >= expectedProgressPercent * 0.5) return "behind";
  return "at_risk";
}

/**
 * Calculate the actual target value for display
 * For RELATIVE goals, this converts percentage to absolute value
 */
export function calculateTargetDisplayValue(
  goalType: GoalType,
  targetValue: number,
  baselineValue: number | null,
): number {
  if (goalType === "ABSOLUTE") {
    return targetValue;
  }

  // RELATIVE: target is baseline * (1 + targetValue/100)
  const baseline = baselineValue ?? 0;
  return baseline * (1 + targetValue / 100);
}
```

---

## Task 4: Create Trend Analyzer

**File**: `src/lib/goals/trend-analyzer.ts`

```typescript
import type { Trend, TrendResult } from "./types";

const MIN_POINTS_FOR_TREND = 3;

/**
 * Analyze trend from chart values
 */
export function analyzeTrend(
  values: number[],
  daysRemaining: number,
): TrendResult {
  if (values.length < MIN_POINTS_FOR_TREND) {
    return { trend: "unknown", projectedEndValue: null, isDecline: false };
  }

  const midpoint = Math.floor(values.length / 2);
  const earlyValues = values.slice(0, midpoint);
  const recentValues = values.slice(midpoint);

  const earlyAvgChange = avgChange(earlyValues);
  const recentAvgChange = avgChange(recentValues);

  const trend = determineTrend(earlyAvgChange, recentAvgChange);
  const lastValue = values[values.length - 1] ?? 0;
  const projectedEndValue = lastValue + recentAvgChange * daysRemaining;

  return {
    trend,
    projectedEndValue,
    isDecline: recentAvgChange < 0,
  };
}

function avgChange(values: number[]): number {
  if (values.length < 2) return 0;

  let total = 0;
  for (let i = 1; i < values.length; i++) {
    total += (values[i] ?? 0) - (values[i - 1] ?? 0);
  }
  return total / (values.length - 1);
}

function determineTrend(earlyAvg: number, recentAvg: number): Trend {
  const threshold = 0.1; // 10% difference is significant

  if (Math.abs(earlyAvg) < 0.001 && Math.abs(recentAvg) < 0.001) {
    return "stable";
  }

  const ratio =
    earlyAvg !== 0
      ? (recentAvg - earlyAvg) / Math.abs(earlyAvg)
      : recentAvg > 0
        ? 1
        : -1;

  if (ratio > threshold) return "accelerating";
  if (ratio < -threshold) return "decelerating";
  return "stable";
}
```

---

## Task 5: Create Value Extractor

**File**: `src/lib/goals/value-extractor.ts`

```typescript
import type { ChartDataForGoal } from "./types";

/**
 * Extract current value from chart (last data point)
 */
export function extractCurrentValue(chart: ChartDataForGoal): number | null {
  const { chartData, dataKeys } = chart;
  if (!chartData?.length || !dataKeys?.length) return null;

  const lastPoint = chartData[chartData.length - 1];
  const primaryKey = dataKeys[0];
  if (!lastPoint || !primaryKey) return null;

  const value = lastPoint[primaryKey];
  return typeof value === "number" ? value : null;
}

/**
 * Extract baseline value (stored or from first data point)
 */
export function extractBaselineValue(
  chart: ChartDataForGoal,
  storedBaseline: number | null,
): number | null {
  if (storedBaseline !== null) return storedBaseline;

  const { chartData, dataKeys } = chart;
  if (!chartData?.length || !dataKeys?.length) return null;

  const firstPoint = chartData[0];
  const primaryKey = dataKeys[0];
  if (!firstPoint || !primaryKey) return null;

  const value = firstPoint[primaryKey];
  return typeof value === "number" ? value : null;
}

/**
 * Extract all numeric values for trend analysis
 */
export function extractAllValues(chart: ChartDataForGoal): number[] {
  const { chartData, dataKeys } = chart;
  if (!chartData || !dataKeys?.length) return [];

  const primaryKey = dataKeys[0];
  if (!primaryKey) return [];

  return chartData
    .map((point) => point[primaryKey])
    .filter((v): v is number => typeof v === "number");
}
```

---

## Task 6: Create Main Goal Progress Function

**File**: `src/lib/goals/index.ts`

```typescript
import { getPeriodBounds } from "./period-bounds";
import {
  calculateAbsoluteProgress,
  calculateRelativeProgress,
  calculateTargetDisplayValue,
  determineStatus,
} from "./progress-calculator";
import { analyzeTrend } from "./trend-analyzer";
import type {
  Cadence,
  ChartDataForGoal,
  GoalInput,
  GoalProgress,
} from "./types";
import {
  extractAllValues,
  extractBaselineValue,
  extractCurrentValue,
} from "./value-extractor";

export * from "./types";
export { getPeriodBounds } from "./period-bounds";
export {
  calculateAbsoluteProgress,
  calculateRelativeProgress,
  determineStatus,
  calculateTargetDisplayValue,
} from "./progress-calculator";
export { analyzeTrend } from "./trend-analyzer";
export {
  extractCurrentValue,
  extractBaselineValue,
  extractAllValues,
} from "./value-extractor";

/**
 * Main function: Calculate complete goal progress
 */
export function calculateGoalProgress(
  goal: GoalInput,
  cadence: Cadence,
  chart: ChartDataForGoal,
): GoalProgress {
  const bounds = getPeriodBounds(cadence);

  const currentValue = extractCurrentValue(chart);
  const baselineValue = extractBaselineValue(chart, goal.baselineValue);
  const allValues = extractAllValues(chart);

  // No data case
  if (currentValue === null) {
    return {
      ...bounds,
      cadence,
      baselineValue,
      currentValue: null,
      targetValue: goal.targetValue,
      targetDisplayValue: calculateTargetDisplayValue(
        goal.goalType,
        goal.targetValue,
        baselineValue,
      ),
      progressPercent: 0,
      expectedProgressPercent: 0,
      status: "no_data",
      trend: "unknown",
      projectedEndValue: null,
      isDecline: false,
    };
  }

  // Invalid baseline for RELATIVE
  if (goal.goalType === "RELATIVE" && baselineValue === null) {
    return {
      ...bounds,
      cadence,
      baselineValue: null,
      currentValue,
      targetValue: goal.targetValue,
      targetDisplayValue: 0,
      progressPercent: 0,
      expectedProgressPercent: 0,
      status: "invalid_baseline",
      trend: "unknown",
      projectedEndValue: null,
      isDecline: false,
    };
  }

  // Calculate progress
  const progress =
    goal.goalType === "ABSOLUTE"
      ? calculateAbsoluteProgress(currentValue, goal.targetValue)
      : calculateRelativeProgress(
          currentValue,
          baselineValue ?? 0,
          goal.targetValue,
        );

  // Expected progress based on time elapsed
  const expectedProgressPercent = (bounds.daysElapsed / bounds.daysTotal) * 100;

  // Status
  const status = determineStatus(
    progress.progressPercent,
    expectedProgressPercent,
    goal.onTrackThreshold,
  );

  // Trend
  const trendResult = analyzeTrend(allValues, bounds.daysRemaining);

  // Target display value (for chart line)
  const targetDisplayValue = calculateTargetDisplayValue(
    goal.goalType,
    goal.targetValue,
    baselineValue,
  );

  return {
    ...bounds,
    cadence,
    baselineValue,
    currentValue,
    targetValue: goal.targetValue,
    targetDisplayValue,
    progressPercent: progress.progressPercent,
    expectedProgressPercent,
    growthPercent: progress.growthPercent,
    status,
    ...trendResult,
  };
}
```

---

## Task 7: Add Goal Line to Chart Component

**File**: `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx`

Add ReferenceLine for goal target:

```typescript
import { ReferenceLine } from "recharts";

// In the chart render function, add goal line:

interface GoalLineProps {
  targetValue: number | null;
  label?: string;
}

function GoalReferenceLine({ targetValue, label }: GoalLineProps) {
  if (targetValue === null) return null;

  return (
    <ReferenceLine
      y={targetValue}
      stroke="hsl(var(--destructive))"  // Red color
      strokeDasharray="6 4"              // Dashed line
      strokeWidth={2}
      label={{
        value: label ?? `Goal: ${targetValue.toLocaleString()}`,
        position: "right",
        fill: "hsl(var(--destructive))",
        fontSize: 12,
        fontWeight: 500,
      }}
    />
  );
}

// Usage in AreaChart/BarChart:
<AreaChart data={chartData}>
  {/* ... existing elements ... */}

  {/* Goal line - only for line/area/bar charts */}
  {goalProgress?.targetDisplayValue && (
    <GoalReferenceLine
      targetValue={goalProgress.targetDisplayValue}
      label={`Goal: ${formatValue(goalProgress.targetDisplayValue)}`}
    />
  )}
</AreaChart>
```

**Where to add**: Inside the chart rendering for `line`, `area`, and `bar` chart types. NOT for `pie`, `radar`, or `radial` charts.

---

## Task 8: Update All Imports and DELETE Old File

### Step 1: Find all imports of old file

```bash
grep -r "from.*goal-calculation" src/
```

Expected files to update:

- `src/server/api/utils/enrich-charts-with-goal-progress.ts`
- Any other files importing from goal-calculation.ts

### Step 2: Update imports in each file

**File**: `src/server/api/utils/enrich-charts-with-goal-progress.ts`

```typescript
// Before:
import { calculateGoalProgress } from "./goal-calculation";

// After:
import { calculateGoalProgress } from "@/lib/goals";
```

Update ALL other files that import from `goal-calculation.ts` to use the new path.

### Step 3: DELETE old file

After all imports are updated, delete the old 467-line file:

```
DELETE: src/server/api/utils/goal-calculation.ts
```

**DO NOT keep as re-export** - update imports and delete immediately.

---

## Files Summary

| Action | File                                                                                |
| ------ | ----------------------------------------------------------------------------------- |
| CREATE | `src/lib/goals/types.ts`                                                            |
| CREATE | `src/lib/goals/period-bounds.ts`                                                    |
| CREATE | `src/lib/goals/progress-calculator.ts`                                              |
| CREATE | `src/lib/goals/trend-analyzer.ts`                                                   |
| CREATE | `src/lib/goals/value-extractor.ts`                                                  |
| CREATE | `src/lib/goals/index.ts`                                                            |
| DELETE | `src/server/api/utils/goal-calculation.ts`                                          |
| MODIFY | `src/server/api/utils/enrich-charts-with-goal-progress.ts` (update import)          |
| MODIFY | `src/app/dashboard/[teamId]/_components/dashboard-metric-chart.tsx` (add goal line) |

---

## Testing Checklist

- [ ] Create metric with ABSOLUTE goal → goal line shows at target value
- [ ] Create metric with RELATIVE goal → goal line shows calculated target
- [ ] Goal line only appears on line/area/bar charts
- [ ] No goal line on pie/radar/radial charts
- [ ] Goal progress calculation still works correctly
- [ ] All existing goal features still work
