/**
 * YouTube Data API v3 Endpoint Definitions
 *
 * IMPORTANT: YouTube has TWO separate APIs:
 * 1. YouTube Data API v3: https://www.googleapis.com/youtube/v3
 * 2. YouTube Analytics API v2: https://youtubeanalytics.googleapis.com/v2
 *
 * This service uses YouTube Data API v3 only.
 * For Analytics API, you need a separate Nango integration.
 *
 * Required OAuth Scopes (configure in Nango):
 * - https://www.googleapis.com/auth/youtube.readonly (for Data API)
 * - https://www.googleapis.com/auth/yt-analytics.readonly (for Analytics API)
 *
 * Nango Configuration:
 * - Provider: Google (use google-youtube or youtube as provider config key)
 * - Base URL: https://www.googleapis.com/youtube/v3
 * - Scopes: youtube.readonly, yt-analytics.readonly
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

import type { ServiceEndpoint } from "./github";
import {
  fetchYouTubeAnalyticsData,
  youtubeAnalyticsEndpoints,
} from "./youtube-analytics";

/**
 * Generic endpoint patterns for metric templates
 * Used by metric system to create dynamic metrics
 */
export const youtubeMetricEndpoints = {
  VIDEO_STATS: "/youtube/v3/videos?part=statistics&id={VIDEO_ID}",
  CHANNEL_STATS: "/youtube/v3/channels?part=statistics&mine=true",
} as const;

/**
 * YouTube Data API v3 Endpoints
 * Base URL: https://www.googleapis.com/youtube/v3
 */
export const youtubeDataEndpoints: ServiceEndpoint[] = [
  // Channel Information
  {
    label: "📊 My Channel Info",
    path: "/youtube/v3/channels?part=snippet,statistics,contentDetails&mine=true",
    method: "GET",
    description:
      "[Data API] Get your channel details, subscriber count, views, and video count",
  },
  {
    label: "📊 Channel by ID",
    path: "/youtube/v3/channels?part=snippet,statistics&id={CHANNEL_ID}",
    method: "GET",
    description: "[Data API] Get channel information by channel ID",
    requiresParams: true,
    params: ["CHANNEL_ID"],
  },

  // Playlists
  {
    label: "📋 My Playlists",
    path: "/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=25",
    method: "GET",
    description: "[Data API] List playlists owned by authenticated user",
  },
  {
    label: "📋 Playlist Items",
    path: "/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId={PLAYLIST_ID}&maxResults=50",
    method: "GET",
    description: "[Data API] Get videos in a specific playlist",
    requiresParams: true,
    params: ["PLAYLIST_ID"],
  },

  // Videos
  {
    label: "🎥 My Uploads",
    path: "/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=25",
    method: "GET",
    description:
      "[Data API] List videos uploaded by authenticated user (recent first)",
  },
  {
    label: "🎥 Video Details",
    path: "/youtube/v3/videos?part=snippet,statistics,contentDetails&id={VIDEO_ID}",
    method: "GET",
    description: "[Data API] Get detailed information about a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },

  // Subscriptions
  {
    label: "👥 My Subscriptions",
    path: "/youtube/v3/subscriptions?part=snippet,contentDetails&mine=true&maxResults=50",
    method: "GET",
    description:
      "[Data API] List channels the authenticated user is subscribed to",
  },

  // Activities
  {
    label: "⚡ My Activities",
    path: "/youtube/v3/activities?part=snippet,contentDetails&mine=true&maxResults=25",
    method: "GET",
    description:
      "[Data API] List channel activities (uploads, likes, favorites, etc.)",
  },

  // Comments (if enabled)
  {
    label: "💬 Video Comments",
    path: "/youtube/v3/commentThreads?part=snippet,replies&videoId={VIDEO_ID}&maxResults=20",
    method: "GET",
    description: "[Data API] Get comments on a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
];

// Combine Data API and Analytics API endpoints
export const youtubeEndpoints: ServiceEndpoint[] = [
  ...youtubeDataEndpoints,
  ...youtubeAnalyticsEndpoints,
];

export const youtubeServiceConfig = {
  name: "YouTube (Data + Analytics APIs)",
  integrationId: "youtube",
  endpoints: youtubeEndpoints,
  baseUrl: "https://www.googleapis.com/youtube/v3",
  exampleParams: {
    CHANNEL_ID: "UC_x5XG1OV2P6uZZ5FSM9Ttw", // Example: Google Developers channel
    VIDEO_ID: "dQw4w9WgXcQ", // Example video ID
    PLAYLIST_ID: "PLrAXtmErZgOeiKm4sgNOknGvNjby9efdf", // Example playlist ID
  },
};

export async function fetchYouTubeData(
  connectionId: string,
  endpoint: string,
  params?: Record<string, string>,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
) {
  // Auto-route to Analytics API if endpoint is for Analytics
  if (
    endpoint.includes("/v2/reports") ||
    endpoint.includes("youtubeanalytics")
  ) {
    return fetchYouTubeAnalyticsData(connectionId, endpoint, params, method);
  }

  // Otherwise, use Data API
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
      endpoint: finalEndpoint,
      method,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[YouTube Data API Fetch] Error details:", {
      error,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      status: (error as any)?.status,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      response: (error as any)?.response?.data,
    });

    // Provide helpful error messages based on status code
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status;
    if (status === 403) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message:
          "YouTube Data API returned 403 Forbidden. Possible causes:\n" +
          "1. OAuth scopes missing - Add 'https://www.googleapis.com/auth/youtube.readonly' in Nango\n" +
          "2. Nango base URL incorrect - Should be 'https://www.googleapis.com'\n" +
          "3. API not enabled - Enable YouTube Data API v3 in Google Cloud Console\n" +
          "4. Quota exceeded - Check your Google Cloud project quotas\n" +
          `\nAttempted endpoint: ${finalEndpoint}`,
      });
    } else if (status === 401) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message:
          "YouTube Data API authentication failed. Please reconnect your YouTube integration.",
      });
    }

    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from YouTube Data API",
    });
  }
}
