/**
 * Formats a number for display with appropriate units (K, M)
 * @param value - The number to format
 * @returns Formatted string (e.g., "1.5K", "2.3M", "42")
 */
export function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}
