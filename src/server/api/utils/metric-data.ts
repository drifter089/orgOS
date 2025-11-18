/**
 * Metric Data Utilities
 *
 * Shared functions for extracting and transforming metric data
 * from various integration responses.
 */

/**
 * Extract a value from a nested object using a dot-notation path
 * @param data The object to extract from
 * @param path Dot-notation path (e.g., "items.0.statistics.viewCount")
 * @returns The extracted value or undefined
 */
export function extractValueFromPath(data: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = data;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }

    if (typeof current === "object" && !Array.isArray(current)) {
      current = (current as Record<string, unknown>)[key];
    } else if (Array.isArray(current)) {
      const index = parseInt(key, 10);
      if (!isNaN(index)) {
        current = current[index];
      } else {
        return undefined;
      }
    } else {
      return undefined;
    }
  }

  return current;
}

/**
 * Apply transformation to extracted data
 * @param value The extracted value
 * @param transformType The transformation type
 * @returns The transformed numeric value
 */
export function applyTransformation(
  value: unknown,
  transformType: string,
): number {
  switch (transformType) {
    case "countRows":
      // Count number of rows in a Google Sheets response
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    case "countEvents":
      // Count number of events in PostHog response
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    case "extractHogQLResults":
    case "extractTrendsResults":
    case "extractEventsResults":
    case "extractInsightResults":
      // For PostHog query results, return row count as the metric value
      // Full data is stored in endpointConfig for visualization
      if (Array.isArray(value)) {
        return value.length;
      }
      return 0;

    default:
      // Default: convert to number
      const numValue = parseFloat(String(value));
      return isNaN(numValue) ? 0 : numValue;
  }
}
