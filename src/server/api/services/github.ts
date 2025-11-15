/**
 * Fetch data from GitHub API using Nango proxy
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

/**
 * GitHub API Endpoint Definitions
 * Base URL handled by Nango proxy
 */

export interface ServiceEndpoint {
  label: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requiresParams?: boolean;
  params?: string[];
}

export const githubEndpoints: ServiceEndpoint[] = [
  {
    label: "User Profile",
    path: "/user",
    method: "GET",
    description: "Get authenticated user's profile information",
  },
  {
    label: "User Repositories",
    path: "/user/repos",
    method: "GET",
    description: "List repositories for the authenticated user",
  },
  {
    label: "Starred Repositories",
    path: "/user/starred",
    method: "GET",
    description: "List repositories starred by the authenticated user",
  },
  {
    label: "User Organizations",
    path: "/user/orgs",
    method: "GET",
    description: "List organizations for the authenticated user",
  },
  {
    label: "User Followers",
    path: "/user/followers",
    method: "GET",
    description: "List followers of the authenticated user",
  },
  {
    label: "User Following",
    path: "/user/following",
    method: "GET",
    description: "List users followed by the authenticated user",
  },
];

export const githubServiceConfig = {
  name: "GitHub",
  integrationId: "github",
  endpoints: githubEndpoints,
  baseUrl: "https://api.github.com",
};

export async function fetchGitHubData(
  connectionId: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: "github",
      endpoint,
      method,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[GitHub API Fetch]", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from GitHub",
    });
  }
}
