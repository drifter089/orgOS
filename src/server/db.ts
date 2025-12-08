import { PrismaClient } from "@prisma/client";
import { withAccelerate } from "@prisma/extension-accelerate";
import { withOptimize } from "@prisma/extension-optimize";

import { env } from "@/env";

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  // Conditionally enable Optimize only in development when API key is set
  const shouldUseOptimize = Boolean(
    env.OPTIMIZE_API_KEY && env.NODE_ENV === "development",
  );

  return client.$extends(withAccelerate()).$extends(
    withOptimize({
      apiKey: env.OPTIMIZE_API_KEY ?? "",
      enable: shouldUseOptimize,
    }),
  );
};

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db;
