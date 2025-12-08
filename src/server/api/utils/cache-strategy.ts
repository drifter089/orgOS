/**
 * Prisma Accelerate Cache Strategy Helpers
 *
 * Provides centralized caching configuration using SWR (stale-while-revalidate)
 * and TTL (time-to-live) patterns for different query types.
 *
 * SWR Pattern:
 * - Returns cached data immediately (if within ttl+swr window)
 * - Triggers background refresh if cache is stale (past ttl but within swr)
 * - Fresh fetch only if cache is completely expired (past ttl+swr)
 *
 * IMPORTANT: The Prisma client is type-cast to PrismaClient for tRPC compatibility,
 * but at runtime it's actually an extended client with Accelerate support.
 *
 * USAGE: Spread the cache strategy into your query options:
 *   ctx.db.team.findMany({
 *     where: {...},
 *     ...cacheStrategy(listCache)
 *   })
 *
 * @see https://www.prisma.io/docs/accelerate/caching
 */

/**
 * Cache strategy configuration type for Prisma Accelerate
 */
export type AccelerateCacheStrategy = {
  ttl: number;
  swr?: number;
};

/**
 * Wraps a cache strategy configuration for spreading into Prisma query options.
 * Uses `Record<string, never>` type assertion - TypeScript sees it as an empty
 * object (so it won't interfere with Prisma's type inference), but at runtime
 * it contains the cacheStrategy property.
 *
 * At runtime, this works because the actual client is the extended Accelerate client.
 *
 * @example
 * ctx.db.team.findMany({
 *   where: { organizationId: ctx.workspace.organizationId },
 *   ...cacheStrategy(listCache)
 * })
 */
export function cacheStrategy(
  strategy: AccelerateCacheStrategy,
): Record<string, never> {
  return { cacheStrategy: strategy } as unknown as Record<string, never>;
}

/**
 * List queries (team.getAll, metric.getAll, etc.)
 * - 60s TTL: Data considered fresh for 1 minute
 * - 120s SWR: Serve stale data for up to 2 more minutes while refreshing
 */
export const listCache: AccelerateCacheStrategy = {
  ttl: 60,
  swr: 120,
};

/**
 * Single item lookups (team.getById, role.getById, etc.)
 * - 30s TTL: Shorter fresh window for individual items
 * - 60s SWR: Serve stale while revalidating
 */
export const singleItemCache: AccelerateCacheStrategy = {
  ttl: 30,
  swr: 60,
};

/**
 * Dashboard data (charts, visualizations)
 * - 60s TTL: Fresh for 1 minute
 * - 300s SWR: Can serve stale dashboard data for up to 5 minutes
 *            (dashboards don't need real-time precision)
 */
export const dashboardCache: AccelerateCacheStrategy = {
  ttl: 60,
  swr: 300,
};

/**
 * Time-series data (metric data points)
 * - 120s TTL: Historical data changes less frequently
 * - 300s SWR: Can serve stale for longer periods
 */
export const timeSeriesCache: AccelerateCacheStrategy = {
  ttl: 120,
  swr: 300,
};

/**
 * Authorization/access check queries
 * - 10s TTL: Short cache for security-sensitive lookups
 * - 30s SWR: Still provide quick responses during revalidation
 */
export const authCheckCache: AccelerateCacheStrategy = {
  ttl: 10,
  swr: 30,
};

/**
 * Configuration/settings data (integrations, canvas state)
 * - 30s TTL: Settings can tolerate short staleness
 * - 120s SWR: Background refresh while serving
 */
export const configCache: AccelerateCacheStrategy = {
  ttl: 30,
  swr: 120,
};

/**
 * Short-lived cache for frequently changing data
 * - 5s TTL: Very short fresh window
 * - 15s SWR: Quick revalidation
 */
export const shortLivedCache: AccelerateCacheStrategy = {
  ttl: 5,
  swr: 15,
};
