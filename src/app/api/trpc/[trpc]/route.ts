import { type NextRequest } from "next/server";

import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { withAuth } from "@workos-inc/authkit-nextjs";

import { env } from "@/env";
import { appRouter } from "@/server/api/root";
import { createTRPCContext } from "@/server/api/trpc";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a HTTP request (e.g. when you make requests from Client Components).
 */
const createContext = async (req: NextRequest) => {
  // Get user from WorkOS
  let user = null;
  try {
    const auth = await withAuth();
    user = auth.user ?? null;
  } catch {
    // User not authenticated
    user = null;
  }

  return createTRPCContext({
    headers: req.headers,
    user,
  });
};

const handler = (req: NextRequest) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => createContext(req),
    onError:
      env.NODE_ENV === "development"
        ? ({ path, error }) => {
            console.error(
              `❌ tRPC failed on ${path ?? "<no-path>"}: ${error.message}`,
            );
          }
        : undefined,
  });

export { handler as GET, handler as POST };
