import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";

import { env } from "@/env";

/**
 * Create Prisma client with Accelerate extension for caching support.
 *
 * Note: The `as unknown as PrismaClient` cast is needed because $extends()
 * breaks tRPC type inference for `include` relations.
 * See: https://github.com/prisma/prisma/issues/23104
 *
 * At RUNTIME, the client still has Accelerate capabilities (cacheStrategy works).
 * The cache-strategy.ts helpers use type assertions to pass cacheStrategy options.
 */
const createPrismaClient = () =>
  new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  }).$extends(withAccelerate()) as unknown as PrismaClient;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
