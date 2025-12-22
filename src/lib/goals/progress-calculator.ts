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
