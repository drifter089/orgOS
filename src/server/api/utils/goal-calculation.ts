import type { GoalPeriod, GoalType, MetricGoal } from "@prisma/client";

import { type db } from "@/server/db";

type DB = typeof db;

export interface GoalProgress {
  // Period info
  periodStart: Date;
  periodEnd: Date;
  daysElapsed: number;
  daysTotal: number;
  daysRemaining: number;

  // Values
  baselineValue: number | null;
  currentValue: number | null;
  targetValue: number;

  // Progress calculation
  progressPercent: number;
  expectedProgressPercent: number;

  // For RELATIVE goals
  growthPercent?: number;

  // Status
  status: "on_track" | "at_risk" | "exceeded" | "no_data";
}

/**
 * Get period boundaries based on goal period type
 */
export function getPeriodBounds(period: GoalPeriod): {
  start: Date;
  end: Date;
} {
  const now = new Date();

  if (period === "WEEKLY") {
    // Monday 00:00:00 to Sunday 23:59:59
    const dayOfWeek = now.getDay();
    const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    const start = new Date(now);
    start.setDate(now.getDate() - daysFromMonday);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  } else {
    // MONTHLY: 1st 00:00:00 to last day 23:59:59
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    return { start, end };
  }
}

/**
 * Calculate goal progress for a metric
 */
export async function calculateGoalProgress(
  database: DB,
  metricId: string,
  goal: MetricGoal,
): Promise<GoalProgress> {
  const { start: periodStart, end: periodEnd } = getPeriodBounds(
    goal.goalPeriod,
  );
  const now = new Date();

  // Calculate days
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal = Math.ceil(
    (periodEnd.getTime() - periodStart.getTime()) / msPerDay,
  );
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

  if (goal.goalType === "ABSOLUTE") {
    // ABSOLUTE: progress = current / target * 100
    progressPercent = (currentValue / goal.targetValue) * 100;
  } else {
    // RELATIVE: progress = actualGrowth / targetGrowth * 100
    if (baselineValue === null || baselineValue === 0) {
      progressPercent = 0;
    } else {
      growthPercent = ((currentValue - baselineValue) / baselineValue) * 100;
      progressPercent = (growthPercent / goal.targetValue) * 100;
    }
  }

  // Calculate expected progress based on time
  const expectedProgressPercent = (daysElapsed / daysTotal) * 100;

  // Determine status
  let status: GoalProgress["status"];
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
