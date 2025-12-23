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
