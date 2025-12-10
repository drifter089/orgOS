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
 * - 1s TTL: Minimal fresh window
 * - 1s SWR: Quick revalidation for immediate visibility of new data
 */
export const shortLivedCache: AccelerateCacheStrategy = {
  ttl: 1,
  swr: 1,
};

/**
 * Team canvas cache with on-demand invalidation
 * - 60s TTL: Longer fresh window (invalidated on mutations)
 * - 120s SWR: Serve stale while revalidating
 * Used with cache tags for immediate invalidation after mutations.
 */
export const teamCanvasCache: AccelerateCacheStrategy = {
  ttl: 60,
  swr: 120,
};

/**
 * Creates a cache strategy with tags for on-demand invalidation.
 * Tags allow selective cache clearing via $accelerate.invalidate().
 *
 * Note: Tags can only contain alphanumeric characters and underscores (no colons).
 *
 * @example
 * ctx.db.team.findUnique({
 *   where: { id: input.id },
 *   ...cacheStrategyWithTags(teamCanvasCache, [`team_${input.id}`])
 * })
 */
export function cacheStrategyWithTags(
  strategy: AccelerateCacheStrategy,
  tags: string[],
): Record<string, never> {
  return {
    cacheStrategy: { ...strategy, tags },
  } as unknown as Record<string, never>;
}

/**
 * Invalidates cached queries by their tags.
 * Must be called after mutations to ensure fresh data on next read.
 *
 * @example
 * await invalidateCacheByTags(ctx.db, [`team_${teamId}`]);
 *
 * @param db - Prisma client with Accelerate extension
 * @param tags - Array of cache tags to invalidate
 */
export async function invalidateCacheByTags(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  tags: string[],
): Promise<void> {
  try {
    // The db client is extended with Accelerate at runtime
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    await db.$accelerate.invalidate({ tags });
  } catch (error) {
    // Log but don't throw - cache invalidation failure shouldn't break mutations
    // P6003 = rate limit exceeded
    console.error("[Cache] Invalidation failed:", error);
  }
}
