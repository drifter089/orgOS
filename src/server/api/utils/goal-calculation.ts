import type { Cadence, GoalType, MetricGoal } from "@prisma/client";

import { type db } from "@/server/db";

type DB = typeof db;

export interface GoalProgress {
  // Period info
  periodStart: Date;
  periodEnd: Date;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;

  // The cadence used for this calculation
  cadence: Cadence;

  // Values
  baselineValue: number | null;
  currentValue: number | null;
  targetValue: number;

  // Progress calculation
  progressPercent: number;
  expectedProgressPercent: number;

  // For RELATIVE goals
  growthPercent?: number;

  // Status - added "invalid_baseline" for RELATIVE goals with 0 baseline
  status: "on_track" | "at_risk" | "exceeded" | "no_data" | "invalid_baseline";
}

/**
 * Get period boundaries based on chart cadence
 * Uses UTC consistently to avoid timezone issues with data points
 *
 * Note: Goal period is now determined by the chart's cadence, not a separate goal period.
 * This ensures goal calculation uses the same time boundaries as the chart display.
 */
export function getPeriodBounds(cadence: Cadence): {
  start: Date;
  end: Date;
} {
  const now = new Date();

  if (cadence === "DAILY") {
    // Today 00:00:00 UTC to 23:59:59 UTC
    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0,
        0,
        0,
        0,
      ),
    );
    const end = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23,
        59,
        59,
        999,
      ),
    );
    return { start, end };
  }

  if (cadence === "WEEKLY") {
    // Monday 00:00:00 UTC to Sunday 23:59:59 UTC
    const dayOfWeek = now.getUTCDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - daysFromMonday,
        0,
        0,
        0,
        0,
      ),
    );

    const end = new Date(
      Date.UTC(
        start.getUTCFullYear(),
        start.getUTCMonth(),
        start.getUTCDate() + 6,
        23,
        59,
        59,
        999,
      ),
    );

    return { start, end };
  }

  // MONTHLY: 1st 00:00:00 UTC to last day 23:59:59 UTC
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
  );

  return { start, end };
}

/**
 * Calculate goal progress for a metric
 *
 * @param database - Database instance
 * @param metricId - The metric ID to calculate progress for
 * @param goal - The goal configuration (goalType and targetValue)
 * @param cadence - The chart's cadence, determines the time period for calculation
 */
export async function calculateGoalProgress(
  database: DB,
  metricId: string,
  goal: MetricGoal,
  cadence: Cadence,
): Promise<GoalProgress> {
  const { start: periodStart, end: periodEnd } = getPeriodBounds(cadence);
  const now = new Date();

  // Calculate days - guard against division by zero with || 1
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal =
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) || 1;
  const daysElapsed = Math.max(
    0,
    Math.ceil((now.getTime() - periodStart.getTime()) / msPerDay),
  );
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  // Get baseline (first value in period)
  const baselinePoint = await database.metricDataPoint.findFirst({
    where: {
      metricId,
      timestamp: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { timestamp: "asc" },
  });

  // Get current (latest value in period)
  const currentPoint = await database.metricDataPoint.findFirst({
    where: {
      metricId,
      timestamp: { gte: periodStart, lte: periodEnd },
    },
    orderBy: { timestamp: "desc" },
  });

  const baselineValue = baselinePoint?.value ?? null;
  const currentValue = currentPoint?.value ?? null;

  // Handle no data case
  if (currentValue === null) {
    return {
      periodStart,
      periodEnd,
      daysElapsed,
      daysTotal,
      daysRemaining,
      cadence,
      baselineValue,
      currentValue,
      targetValue: goal.targetValue,
      progressPercent: 0,
      expectedProgressPercent: (daysElapsed / daysTotal) * 100,
      status: "no_data",
    };
  }

  // Calculate progress based on goal type
  let progressPercent: number;
  let growthPercent: number | undefined;
  let status: GoalProgress["status"];

  // Guard against division by zero for targetValue
  if (!goal.targetValue || goal.targetValue === 0) {
    progressPercent = 0;
  } else if (goal.goalType === "ABSOLUTE") {
    // ABSOLUTE: progress = current / target * 100
    progressPercent = (currentValue / goal.targetValue) * 100;
  } else {
    // RELATIVE: progress = actualGrowth / targetGrowth * 100
    if (baselineValue === null || baselineValue === 0) {
      // Cannot calculate growth from zero or null baseline
      return {
        periodStart,
        periodEnd,
        daysElapsed,
        daysTotal,
        daysRemaining,
        cadence,
        baselineValue,
        currentValue,
        targetValue: goal.targetValue,
        progressPercent: 0,
        expectedProgressPercent: (daysElapsed / daysTotal) * 100,
        status: "invalid_baseline",
      };
    }
    growthPercent = ((currentValue - baselineValue) / baselineValue) * 100;
    progressPercent = (growthPercent / goal.targetValue) * 100;
  }

  // Calculate expected progress based on time
  const expectedProgressPercent = (daysElapsed / daysTotal) * 100;

  // Determine status
  if (progressPercent >= 100) {
    status = "exceeded";
  } else if (progressPercent >= expectedProgressPercent * 0.8) {
    // Within 80% of expected = on track
    status = "on_track";
  } else {
    status = "at_risk";
  }

  return {
    periodStart,
    periodEnd,
    daysElapsed,
    daysTotal,
    daysRemaining,
    cadence,
    baselineValue,
    currentValue,
    targetValue: goal.targetValue,
    progressPercent: Math.round(progressPercent * 10) / 10,
    expectedProgressPercent: Math.round(expectedProgressPercent * 10) / 10,
    growthPercent:
      growthPercent !== undefined
        ? Math.round(growthPercent * 10) / 10
        : undefined,
    status,
  };
}

/**
 * Calculate the actual target value for display on charts
 * For ABSOLUTE goals: returns the target value directly
 * For RELATIVE goals: calculates target based on baseline + growth percentage
 */
export function calculateGoalTargetValue(
  goal: { goalType: GoalType; targetValue: number },
  progress: GoalProgress,
): number | null {
  if (goal.goalType === "ABSOLUTE") {
    return goal.targetValue;
  }

  // For RELATIVE goals, calculate the target based on baseline
  if (
    progress.baselineValue !== null &&
    progress.baselineValue !== undefined &&
    progress.baselineValue !== 0
  ) {
    return progress.baselineValue * (1 + goal.targetValue / 100);
  }

  return null;
}
