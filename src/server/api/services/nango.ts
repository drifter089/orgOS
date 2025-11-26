/**
 * Universal Nango data fetcher
 * This is the ONLY function for fetching data from third-party APIs
 */
import { TRPCError } from "@trpc/server";
import axios from "axios";

import { env } from "@/env";
import { nango } from "@/server/nango";

interface FetchOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  params?: Record<string, string>;
  body?: unknown;
}

/**
 * Calculate date in YYYY-MM-DD format relative to today
 */
function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split("T")[0]!;
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

  // Replace date placeholders with actual YYYY-MM-DD dates
  let finalEndpoint = endpoint
    .replace(/28daysAgo/g, getDateString(28))
    .replace(/today/g, getDateString(0));

  // Replace {PARAM} placeholders in endpoint
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

  try {
    // Check if this is a full URL (for YouTube Analytics API v2)
    const isFullUrl =
      finalEndpoint.startsWith("http://") ||
      finalEndpoint.startsWith("https://");

    if (isFullUrl) {
      // For full URLs (like YouTube Analytics API), get the token and make direct request
      const tokenResponse = await nango.getToken(integrationId, connectionId);

      // Extract access token (supports both string tokens and OAuth2 token objects)
      const accessToken =
        typeof tokenResponse === "string"
          ? tokenResponse
          : "accessToken" in tokenResponse
            ? tokenResponse.accessToken
            : "";

      if (!accessToken) {
        throw new Error("Failed to retrieve access token from Nango");
      }

      const response = await axios({
        method: options?.method ?? "GET",
        url: finalEndpoint,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        ...(finalBody ? { data: finalBody } : {}),
      });

      return {
        data: response.data,
        status: response.status,
      };
    } else {
      // For relative paths, use Nango proxy (existing behavior)
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
    }
  } catch (error) {
    console.error(`[${integrationId} API Fetch]`, error);

    // Log detailed error for debugging
    if (axios.isAxiosError(error)) {
      console.error("Request URL:", finalEndpoint);
      console.error("Response status:", error.response?.status);
      console.error(
        "Response data:",
        JSON.stringify(error.response?.data, null, 2),
      );
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : `Failed to fetch from ${integrationId}`,
    });
  }
}
