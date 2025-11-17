/**
 * YouTube Analytics API v2 Endpoint Definitions
 *
 * SEPARATE from YouTube Data API v3!
 *
 * Base URL: https://youtubeanalytics.googleapis.com/v2
 *
 * Required OAuth Scopes (configure in Nango):
 * - https://www.googleapis.com/auth/yt-analytics.readonly
 * - https://www.googleapis.com/auth/yt-analytics-monetary.readonly (for revenue data)
 *
 * Nango Configuration:
 * - Provider: Create a separate Nango integration with key "youtube-analytics"
 * - Base URL: https://youtubeanalytics.googleapis.com
 * - Scopes: yt-analytics.readonly
 *
 * IMPORTANT: You need to create a SEPARATE Nango integration for Analytics API
 * because it uses a different base URL than the Data API.
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

import type { ServiceEndpoint } from "./github";

/**
 * YouTube Analytics API v2 Endpoints
 * Base URL: https://youtubeanalytics.googleapis.com/v2
 */
export const youtubeAnalyticsEndpoints: ServiceEndpoint[] = [
  // Channel Reports - Time-based
  {
    label: "Channel Analytics - 28 Days",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost",
    method: "GET",
    description:
      "Get channel analytics for date range (views, watch time, subscribers)",
  },
  {
    label: "Channel Analytics - Last 7 Days",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-11-10&endDate=2024-11-17&metrics=views,estimatedMinutesWatched,likes,comments,shares",
    method: "GET",
    description: "Get recent channel engagement metrics",
  },
  {
    label: "Daily Channel Stats",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-10-01&endDate=2024-11-17&metrics=views,estimatedMinutesWatched&dimensions=day",
    method: "GET",
    description: "Get daily breakdown of views and watch time",
  },

  // Top Content
  {
    label: "Top Videos by Views",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views,estimatedMinutesWatched,averageViewDuration,likes&dimensions=video&sort=-views&maxResults=10",
    method: "GET",
    description: "Get top 10 performing videos by views",
  },
  {
    label: "Top Videos by Watch Time",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views,estimatedMinutesWatched&dimensions=video&sort=-estimatedMinutesWatched&maxResults=10",
    method: "GET",
    description: "Get top 10 videos by total watch time",
  },

  // Traffic Sources
  {
    label: "Traffic Sources",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views&dimensions=insightTrafficSourceType&sort=-views",
    method: "GET",
    description:
      "Analyze where channel views come from (search, suggested, external, etc.)",
  },
  {
    label: "Search Terms",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=25",
    method: "GET",
    description: "Top YouTube search terms that led to your videos",
  },

  // Demographics
  {
    label: "Geographic Analytics",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views,estimatedMinutesWatched&dimensions=country&sort=-views&maxResults=10",
    method: "GET",
    description: "Get top 10 countries by viewership",
  },
  {
    label: "Age & Gender",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=viewerPercentage&dimensions=ageGroup,gender&sort=-viewerPercentage",
    method: "GET",
    description: "Viewer demographics by age and gender",
  },

  // Device Types
  {
    label: "Device Analytics",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views&dimensions=deviceType&sort=-views",
    method: "GET",
    description: "Views by device type (mobile, desktop, tablet, TV)",
  },

  // Video-specific Reports (requires VIDEO_ID parameter)
  {
    label: "Video Analytics",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares&filters=video=={VIDEO_ID}",
    method: "GET",
    description: "Get detailed analytics for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
  {
    label: "Video Traffic Sources",
    path: "/v2/reports?ids=channel==MINE&startDate=2024-01-01&endDate=2024-12-31&metrics=views&dimensions=insightTrafficSourceType&filters=video=={VIDEO_ID}&sort=-views",
    method: "GET",
    description: "Analyze traffic sources for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
];

export const youtubeAnalyticsServiceConfig = {
  name: "YouTube Analytics API",
  integrationId: "youtube-analytics",
  endpoints: youtubeAnalyticsEndpoints,
  baseUrl: "https://youtubeanalytics.googleapis.com/v2",
  exampleParams: {
    VIDEO_ID: "dQw4w9WgXcQ", // Example video ID
  },
};

export async function fetchYouTubeAnalyticsData(
  connectionId: string,
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  // Replace parameter placeholders with actual values
  let finalEndpoint = endpoint;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      finalEndpoint = finalEndpoint.replace(`{${key}}`, value);
    });
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: "youtube",
      baseUrlOverride: "https://youtubeanalytics.googleapis.com",
      endpoint: finalEndpoint,
      method,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[YouTube Analytics API Fetch] Error details:", {
      error,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (error as any)?.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: (error as any)?.response?.data,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status;
    if (status === 403) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "YouTube Analytics API returned 403 Forbidden. Possible causes:\n" +
          "1. OAuth scope missing - Add 'https://www.googleapis.com/auth/yt-analytics.readonly' to your YouTube integration in Nango\n" +
          "2. YouTube Analytics API not enabled in Google Cloud Console\n" +
          "3. Channel doesn't have enough data or isn't eligible for Analytics\n" +
          "4. Date range is invalid (dates must be YYYY-MM-DD format, e.g., 2024-11-01)\n" +
          `\nAttempted endpoint: ${finalEndpoint}`,
      });
    } else if (status === 401) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "YouTube Analytics authentication failed. Please reconnect your YouTube integration.",
      });
    } else if (status === 400) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message:
          "Invalid Analytics API request. Check your date format (YYYY-MM-DD) and metric names.\n" +
          `Endpoint: ${finalEndpoint}`,
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from YouTube Analytics",
    });
  }
}
