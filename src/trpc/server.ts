import { cache } from "react";

import { headers } from "next/headers";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { withAuth } from "@workos-inc/authkit-nextjs";
import "server-only";

import { type AppRouter, createCaller } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  // Get user from WorkOS (works in Server Component context)
  const { user } = await withAuth();

  return createTRPCContext({
    headers: heads,
    user: user ?? null,
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
