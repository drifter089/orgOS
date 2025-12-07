/**
 * Shared utilities for the metrics system
 * Extracted from nango.ts and ai-transformer.ts for reuse
 */

// =============================================================================
// Date Utilities
// =============================================================================

/**
 * Calculate date in YYYY-MM-DD format relative to today
 */
export function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0]!;
}

/**
 * Get date from placeholder string (e.g., "28daysAgo", "today")
 */
export function getDateFromPlaceholder(placeholder: string): string {
  if (placeholder === "today") {
    return getDateString(0);
  }

  const match = /(\d+)daysAgo/.exec(placeholder);
  if (match) {
    return getDateString(parseInt(match[1]!, 10));
  }

  return placeholder;
}

// =============================================================================
// Chart Types
// =============================================================================

/**
 * Chart types supported by Recharts
 */
export const CHART_TYPES = [
  "line",
  "bar",
  "area",
  "pie",
  "radar",
  "radial",
  "kpi",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];
