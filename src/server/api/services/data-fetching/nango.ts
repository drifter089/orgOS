/**
 * Universal Nango data fetcher
 * This is the ONLY function for fetching data from third-party APIs
 */
import { TRPCError } from "@trpc/server";
import axios from "axios";

import { env } from "@/env";
import { getDateString } from "@/lib/metrics/utils";
import { nango } from "@/server/nango";

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

      const accessToken =
        typeof tokenResponse === "string"
          ? tokenResponse
          : "accessToken" in tokenResponse
            ? (tokenResponse.accessToken as string)
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
        data: response.data as unknown,
        status: response.status,
      };
    } else {
      // For relative paths, use Nango proxy (existing behavior)
      // Linear's GraphQL API requires specific headers to prevent CSRF
      const isGraphQL = finalEndpoint.includes("/graphql");
      const headers: Record<string, string> = {};

      if (isGraphQL) {
        headers["Content-Type"] = "application/json";
        // Linear requires this header for CSRF protection
        headers["apollo-require-preflight"] = "true";
      }

      const response = await nango.proxy({
        connectionId,
        providerConfigKey: integrationId,
        endpoint: finalEndpoint,
        method: options?.method ?? "GET",
        ...(finalBody ? { data: finalBody } : {}),
        ...(Object.keys(headers).length > 0 ? { headers } : {}),
      });

      const isGitHubStats =
        integrationId === "github" && finalEndpoint.includes("/stats/");
      const responseData = response.data as Record<string, unknown> | null;
      const isEmptyResponse =
        response.status === 202 ||
        (responseData &&
          typeof responseData === "object" &&
          Object.keys(responseData).length === 0);

      if (isGitHubStats && isEmptyResponse) {
        console.info(
          "[GitHub Stats] Empty response - GitHub is computing statistics. Retrying...",
        );
        const delays = [2000, 4000, 6000]; // 2s, 4s, 6s
        for (let i = 0; i < delays.length; i++) {
          await new Promise((resolve) => setTimeout(resolve, delays[i]));
          console.info(
            `[GitHub Stats] Retry ${i + 1}/${delays.length} after ${delays[i]}ms...`,
          );

          const retryResponse = await nango.proxy({
            connectionId,
            providerConfigKey: integrationId,
            endpoint: finalEndpoint,
            method: options?.method ?? "GET",
          });

          const retryData = retryResponse.data as Record<
            string,
            unknown
          > | null;
          const isStillEmpty =
            retryResponse.status === 202 ||
            (retryData &&
              typeof retryData === "object" &&
              Object.keys(retryData).length === 0);

          if (!isStillEmpty) {
            console.info("[GitHub Stats] Got data on retry!");
            return {
              data: retryData,
              status: retryResponse.status,
            };
          }
        }
        console.info(
          "[GitHub Stats] Still empty after retries. Statistics may not be available for this repo.",
        );
      }

      return {
        data: responseData,
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
