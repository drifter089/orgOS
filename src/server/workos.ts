import { WorkOS } from "@workos-inc/node";

const globalForWorkos = globalThis as unknown as {
  workos: WorkOS | undefined;
};

export const workos =
  globalForWorkos.workos ?? new WorkOS(process.env.WORKOS_API_KEY);

if (process.env.NODE_ENV !== "production") {
  globalForWorkos.workos = workos;
}
