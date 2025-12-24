/**
 * Utility functions for metric ID handling.
 * Centralizes temp/optimistic ID logic.
 */

export const TEMP_ID_PREFIX = "temp-";

/**
 * Check if a metric ID is a temporary/optimistic ID.
 * Temp IDs are used for optimistic UI updates before server response.
 */
export function isTempMetricId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

/**
 * Create a new temporary metric ID.
 * Used when creating optimistic cards before server response.
 */
export function createTempMetricId(): string {
  return `${TEMP_ID_PREFIX}${Date.now()}`;
}
