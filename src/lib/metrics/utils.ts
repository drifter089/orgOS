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
// Parameter Substitution
// =============================================================================

/**
 * Substitute placeholders in a template string with actual values
 */
export function substituteParams(
  template: string,
  params: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, "g"), value);
  }
  return result;
}

// =============================================================================
// Chart Constants
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

/**
 * Color palette for charts using CSS variables
 */
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
  "var(--chart-7)",
  "var(--chart-8)",
  "var(--chart-9)",
  "var(--chart-10)",
  "var(--chart-11)",
  "var(--chart-12)",
] as const;
