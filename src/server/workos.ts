import { WorkOS } from "@workos-inc/node";

import { env } from "@/env";

const globalForWorkos = globalThis as unknown as {
  workos: WorkOS | undefined;
};

export const workos = globalForWorkos.workos ?? new WorkOS(env.WORKOS_API_KEY);

if (env.NODE_ENV !== "production") {
  globalForWorkos.workos = workos;
}
