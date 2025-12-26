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
  calculateTargetDisplayValue,
  determineStatus,
} from "./progress-calculator";
export { analyzeTrend } from "./trend-analyzer";
export {
  calculateSuggestedRange,
  extractAllValues,
  extractBaselineValue,
  extractCurrentValue,
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
