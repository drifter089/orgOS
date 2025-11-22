/**
 * Data transformation functions for PostHog API responses
 * These functions transform API data into formats suitable for UI display
 */

/**
 * Transform PostHog projects API response to dropdown options
 */
export function transformProjects(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: Array<{ name: string; id: number }>;
  };

  return (
    response.results?.map((p) => ({
      label: p.name,
      value: p.id.toString(),
    })) ?? []
  );
}

/**
 * Transform PostHog event definitions API response to dropdown options
 */
export function transformEvents(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: Array<{ name: string }>;
  };

  return (
    response.results?.map((e) => ({
      label: e.name,
      value: e.name,
    })) ?? []
  );
}

/**
 * Transform PostHog query results to metric value (event count)
 */
export function transformEventCount(
  data: unknown,
): Array<{ date: string; count: number }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: Array<Array<string | number>>;
  };

  if (!Array.isArray(response.results)) return [];

  return response.results.map((row) => ({
    date: row[0]?.toString() ?? "",
    count: typeof row[1] === "number" ? row[1] : 0,
  }));
}

/**
 * Transform PostHog persons API response to user count
 */
export function transformActiveUsers(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    count?: number;
    results?: unknown[];
  };

  // PostHog returns either count or results array
  if (response.count !== undefined) return response.count;
  if (Array.isArray(response.results)) return response.results.length;

  return 0;
}

/**
 * Registry of all PostHog transformation functions
 */
export const POSTHOG_TRANSFORMS = {
  projects: transformProjects,
  events: transformEvents,
  eventCount: transformEventCount,
  activeUsers: transformActiveUsers,
};
