import { Nango } from "@nangohq/node";

import { env } from "@/env";

const createNangoClient = () =>
  new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

const globalForNango = globalThis as unknown as {
  nango: ReturnType<typeof createNangoClient> | undefined;
};

export const nango = globalForNango.nango ?? createNangoClient();

if (env.NODE_ENV !== "production") globalForNango.nango = nango;
