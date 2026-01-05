import { Cadence, GoalType } from "@prisma/client";

// Re-export Prisma enums for convenience
export { Cadence, GoalType };

// Custom status type (not in Prisma)
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
  selectedDimension?: string | null;
}
