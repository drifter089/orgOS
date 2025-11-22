/**
 * Universal Nango data fetcher
 * This is the ONLY function for fetching data from third-party APIs
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

export async function fetchData(
  integrationId: string,
  connectionId: string,
  endpoint: string,
  options?: FetchOptions,
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  // Replace {PARAM} placeholders in endpoint
  let finalEndpoint = endpoint;
  if (options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
    });
  }

  // Replace params in body if it's a string template
  let finalBody = options?.body;
  if (typeof finalBody === "string" && options?.params) {
    Object.entries(options.params).forEach(([key, value]) => {
      finalBody = (finalBody as string).replace(
        new RegExp(`\\{${key}\\}`, "g"),
        value,
      );
    });
    try {
      finalBody = JSON.parse(finalBody);
    } catch {
      // Keep as string if not valid JSON
    }
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: integrationId,
      endpoint: finalEndpoint,
      method: options?.method ?? "GET",
      ...(finalBody ? { data: finalBody } : {}),
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error(`[${integrationId} API Fetch]`, error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : `Failed to fetch from ${integrationId}`,
    });
  }
}
