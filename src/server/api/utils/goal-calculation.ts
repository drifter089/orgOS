import type { Cadence, GoalType, MetricGoal } from "@prisma/client";

import type { ChartConfig } from "@/lib/metrics/transformer-types";

/**
 * Goal progress status types
 */
export type GoalProgressStatus =
  | "exceeded"
  | "on_track"
  | "behind"
  | "at_risk"
  | "no_data"
  | "invalid_baseline";

/**
 * Trend direction for goal progress
 */
export type GoalTrend = "accelerating" | "stable" | "decelerating" | "unknown";

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

  // Status
  status: GoalProgressStatus;

  // Trend analysis
  trend: GoalTrend;
  projectedEndValue: number | null;

  // Decline indicator
  isDecline: boolean;
}

/**
 * Status thresholds configuration
 */
interface StatusThresholds {
  exceeded: number; // Default: 100
  onTrack: number; // Default: 80 (% of expected)
  behind: number; // Default: 50 (% of expected)
}

const DEFAULT_THRESHOLDS: StatusThresholds = {
  exceeded: 100,
  onTrack: 80,
  behind: 50,
};

/**
 * Get period boundaries based on goal cadence
 * Uses UTC consistently to avoid timezone issues with data points
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
 * Extract current value from chart's aggregated data
 * Uses the first dataKey to get numeric values from chartData
 */
function extractCurrentValueFromChartData(chartConfig: ChartConfig): {
  currentValue: number | null;
  chartBaseline: number | null;
} {
  const { chartData, dataKeys } = chartConfig;

  // No data available
  if (
    !chartData ||
    chartData.length === 0 ||
    !dataKeys ||
    dataKeys.length === 0
  ) {
    return { currentValue: null, chartBaseline: null };
  }

  // Use the first dataKey (primary value)
  const valueKey = dataKeys[0];
  if (!valueKey) {
    return { currentValue: null, chartBaseline: null };
  }

  // Get first and last data points
  const firstPoint = chartData[0];
  const lastPoint = chartData[chartData.length - 1];

  // Extract numeric values
  const chartBaseline =
    firstPoint && valueKey in firstPoint
      ? Number(firstPoint[valueKey]) || null
      : null;

  const currentValue =
    lastPoint && valueKey in lastPoint
      ? Number(lastPoint[valueKey]) || null
      : null;

  return { currentValue, chartBaseline };
}

/**
 * Calculate average rate of change for a series of data points
 */
function calculateAverageChange(
  data: Record<string, unknown>[],
  valueKey: string,
): number {
  if (data.length < 2) return 0;

  let totalChange = 0;
  let validPairs = 0;

  for (let i = 1; i < data.length; i++) {
    const prevVal = Number(data[i - 1]?.[valueKey]);
    const currVal = Number(data[i]?.[valueKey]);

    if (!isNaN(prevVal) && !isNaN(currVal) && prevVal !== 0) {
      totalChange += currVal - prevVal;
      validPairs++;
    }
  }

  return validPairs > 0 ? totalChange / validPairs : 0;
}

/**
 * Calculate trend based on acceleration of change
 */
function calculateTrend(
  chartData: Record<string, unknown>[],
  valueKey: string,
  daysRemaining: number,
): { trend: GoalTrend; projectedEndValue: number | null } {
  // Need at least 3 data points to determine trend
  if (chartData.length < 3) {
    return { trend: "unknown", projectedEndValue: null };
  }

  // Split data into early and recent halves
  const midpoint = Math.floor(chartData.length / 2);
  const earlyData = chartData.slice(0, midpoint + 1);
  const recentData = chartData.slice(midpoint);

  const earlyAvgChange = calculateAverageChange(earlyData, valueKey);
  const recentAvgChange = calculateAverageChange(recentData, valueKey);

  // Determine trend based on acceleration
  const acceleration = recentAvgChange - earlyAvgChange;
  const threshold = Math.abs(earlyAvgChange) * 0.1 || 0.01; // 10% change = significant

  let trend: GoalTrend;
  if (Math.abs(acceleration) < threshold) {
    trend = "stable";
  } else if (acceleration > 0) {
    trend = "accelerating";
  } else {
    trend = "decelerating";
  }

  // Project end value using linear extrapolation
  const lastValue = Number(chartData[chartData.length - 1]?.[valueKey]);
  if (isNaN(lastValue)) {
    return { trend, projectedEndValue: null };
  }

  // Use recent average change rate to project
  const projectedEndValue = lastValue + recentAvgChange * daysRemaining;

  return {
    trend,
    projectedEndValue: Math.round(projectedEndValue * 100) / 100,
  };
}

/**
 * Determine goal status based on progress and thresholds
 */
function determineStatus(
  progressPercent: number,
  expectedProgressPercent: number,
  thresholds: StatusThresholds,
): GoalProgressStatus {
  if (progressPercent >= thresholds.exceeded) {
    return "exceeded";
  }

  // Compare to expected progress, adjusted by threshold
  const onTrackTarget = expectedProgressPercent * (thresholds.onTrack / 100);
  const behindTarget = expectedProgressPercent * (thresholds.behind / 100);

  if (progressPercent >= onTrackTarget) {
    return "on_track";
  }
  if (progressPercent >= behindTarget) {
    return "behind";
  }
  return "at_risk";
}

/**
 * Calculate goal progress using chart's cadence and goal's stored baseline
 *
 * This function uses:
 * - Chart's cadence for period calculation
 * - Goal's stored baseline if available, otherwise falls back to chart data
 * - Chart's current value for progress calculation
 *
 * @param goal - The goal configuration with baseline and thresholds
 * @param cadence - The chart's cadence (DAILY, WEEKLY, MONTHLY)
 * @param chartConfig - The chart's configuration containing aggregated data
 */
export function calculateGoalProgress(
  goal: MetricGoal,
  cadence: Cadence,
  chartConfig: ChartConfig,
): GoalProgress {
  const { start: periodStart, end: periodEnd } = getPeriodBounds(cadence);
  const now = new Date();

  // Calculate days - use Math.floor for accurate "completed days"
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysTotal =
    Math.ceil((periodEnd.getTime() - periodStart.getTime()) / msPerDay) || 1;
  const daysElapsed = Math.max(
    0,
    Math.floor((now.getTime() - periodStart.getTime()) / msPerDay),
  );
  const daysRemaining = Math.max(0, daysTotal - daysElapsed);

  // Extract current value from chart data
  const { currentValue, chartBaseline } =
    extractCurrentValueFromChartData(chartConfig);

  // Use goal's stored baseline if available, otherwise use chart's first data point
  const baselineValue = goal.baselineValue ?? chartBaseline;

  // Get value key for trend calculation
  const valueKey = chartConfig.dataKeys?.[0] ?? "value";

  // Calculate trend
  const { trend, projectedEndValue } = calculateTrend(
    chartConfig.chartData ?? [],
    valueKey,
    daysRemaining,
  );

  // Check for decline
  const isDecline =
    currentValue !== null &&
    baselineValue !== null &&
    currentValue < baselineValue;

  // Get thresholds (use goal's custom threshold or defaults)
  const thresholds: StatusThresholds = {
    ...DEFAULT_THRESHOLDS,
    onTrack: goal.onTrackThreshold ?? DEFAULT_THRESHOLDS.onTrack,
  };

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
      expectedProgressPercent: roundToOneDecimal(
        (daysElapsed / daysTotal) * 100,
      ),
      status: "no_data",
      trend,
      projectedEndValue,
      isDecline: false,
    };
  }

  // Calculate progress based on goal type
  let progressPercent: number;
  let growthPercent: number | undefined;

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
        expectedProgressPercent: roundToOneDecimal(
          (daysElapsed / daysTotal) * 100,
        ),
        status: "invalid_baseline",
        trend,
        projectedEndValue,
        isDecline,
      };
    }
    growthPercent = ((currentValue - baselineValue) / baselineValue) * 100;
    progressPercent = (growthPercent / goal.targetValue) * 100;

    // Cap negative progress at -100% to avoid confusing numbers
    if (progressPercent < -100) {
      progressPercent = -100;
    }
  }

  // Calculate expected progress based on time
  const expectedProgressPercent = (daysElapsed / daysTotal) * 100;

  // Determine status using configurable thresholds
  const status = determineStatus(
    progressPercent,
    expectedProgressPercent,
    thresholds,
  );

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
    progressPercent: roundToOneDecimal(progressPercent),
    expectedProgressPercent: roundToOneDecimal(expectedProgressPercent),
    growthPercent:
      growthPercent !== undefined
        ? roundToOneDecimal(growthPercent)
        : undefined,
    status,
    trend,
    projectedEndValue,
    isDecline,
  };
}

/**
 * Round a number to one decimal place
 */
function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Calculate the actual target value for display on charts
 * For ABSOLUTE goals: returns the target value directly
 * For RELATIVE goals: calculates target based on baseline + growth percentage
 */
export function calculateGoalTargetValue(
  goal: {
    goalType: GoalType;
    targetValue: number;
    baselineValue?: number | null;
  },
  progress: GoalProgress,
): number | null {
  if (goal.goalType === "ABSOLUTE") {
    return goal.targetValue;
  }

  // For RELATIVE goals, use goal's stored baseline if available, otherwise progress baseline
  const baseline = goal.baselineValue ?? progress.baselineValue;

  if (baseline !== null && baseline !== undefined && baseline !== 0) {
    return baseline * (1 + goal.targetValue / 100);
  }

  return null;
}
