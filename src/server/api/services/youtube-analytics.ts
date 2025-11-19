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

// ============================================================================
// Dynamic Date Helpers
// ============================================================================

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0]!;
}

function getDateRange(daysAgo: number): { startDate: string; endDate: string } {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - daysAgo);
  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
  };
}

const last7Days = getDateRange(7);
const last28Days = getDateRange(28);
const last90Days = getDateRange(90);

// ============================================================================
// Metric Endpoint Templates for Templates System
// ============================================================================

export const youtubeAnalyticsMetricEndpoints = {
  // Channel-level time series analytics endpoints (with dimensions=day for plotting)
  CHANNEL_DAILY_VIEWS_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=day`,
  CHANNEL_DAILY_WATCH_TIME_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=estimatedMinutesWatched&dimensions=day`,
  CHANNEL_DAILY_AVG_VIEW_DURATION_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=averageViewDuration&dimensions=day`,
  CHANNEL_DAILY_SUBSCRIBERS_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=subscribersGained,subscribersLost&dimensions=day`,
  CHANNEL_DAILY_ENGAGEMENT_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=likes,comments,shares&dimensions=day`,

  // Video-level time series analytics endpoints (require VIDEO_ID)
  VIDEO_DAILY_VIEWS_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=day&filters=video=={VIDEO_ID}`,
  VIDEO_DAILY_WATCH_TIME_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=estimatedMinutesWatched&dimensions=day&filters=video=={VIDEO_ID}`,
  VIDEO_DAILY_ENGAGEMENT_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=likes,comments,shares&dimensions=day&filters=video=={VIDEO_ID}`,

  // Top videos comparison (returns per-video breakdown)
  TOP_VIDEOS_BY_VIEWS_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares&dimensions=video&sort=-views&maxResults=25`,
  TOP_VIDEOS_BY_WATCH_TIME_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=video&sort=-estimatedMinutesWatched&maxResults=25`,

  // Traffic sources breakdown
  TRAFFIC_SOURCES_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views`,

  // Geographic breakdown
  GEOGRAPHIC_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=country&sort=-views&maxResults=25`,

  // Device breakdown
  DEVICE_28D: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=deviceType&sort=-views`,
} as const;

/**
 * YouTube Analytics API v2 Endpoints
 * Base URL: https://youtubeanalytics.googleapis.com/v2
 */
export const youtubeAnalyticsEndpoints: ServiceEndpoint[] = [
  // ============================================================================
  // Channel Reports - Time-based
  // ============================================================================
  {
    label: "📊 Channel Analytics - Last 28 Days",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost`,
    method: "GET",
    description:
      "Get channel analytics for last 28 days (views, watch time, subscribers)",
  },
  {
    label: "📊 Channel Analytics - Last 7 Days",
    path: `/v2/reports?ids=channel==MINE&startDate=${last7Days.startDate}&endDate=${last7Days.endDate}&metrics=views,estimatedMinutesWatched,likes,comments,shares`,
    method: "GET",
    description: "Get recent channel engagement metrics",
  },
  {
    label: "📊 Channel Analytics - Last 90 Days",
    path: `/v2/reports?ids=channel==MINE&startDate=${last90Days.startDate}&endDate=${last90Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,comments,shares`,
    method: "GET",
    description: "Get comprehensive channel analytics for last 90 days",
  },
  {
    label: "📈 Daily Channel Stats (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=day`,
    method: "GET",
    description: "Get daily breakdown of views and watch time for plotting",
  },
  {
    label: "📈 Daily Subscribers (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=subscribersGained,subscribersLost&dimensions=day`,
    method: "GET",
    description: "Get daily subscriber changes for trend analysis",
  },
  {
    label: "📈 Daily Engagement (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=likes,comments,shares&dimensions=day`,
    method: "GET",
    description: "Get daily engagement breakdown for plotting",
  },

  // ============================================================================
  // Top Content & Comparisons
  // ============================================================================
  {
    label: "🏆 Top Videos by Views (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares&dimensions=video&sort=-views&maxResults=25`,
    method: "GET",
    description: "Get top 25 performing videos by views with full metrics",
  },
  {
    label: "🏆 Top Videos by Watch Time (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=video&sort=-estimatedMinutesWatched&maxResults=25`,
    method: "GET",
    description: "Get top 25 videos by total watch time",
  },
  {
    label: "🏆 Top Videos by Engagement (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,likes,comments,shares&dimensions=video&sort=-likes&maxResults=25`,
    method: "GET",
    description: "Get top 25 videos by engagement (likes)",
  },
  {
    label: "📊 All Videos Comparison (90 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last90Days.startDate}&endDate=${last90Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares&dimensions=video&sort=-views&maxResults=50`,
    method: "GET",
    description: "Compare all videos performance over 90 days",
  },

  // ============================================================================
  // Traffic Sources
  // ============================================================================
  {
    label: "🔍 Traffic Sources (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&sort=-views`,
    method: "GET",
    description:
      "Analyze where channel views come from (search, suggested, external, etc.)",
  },
  {
    label: "🔍 Search Terms (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==YT_SEARCH&sort=-views&maxResults=50`,
    method: "GET",
    description: "Top YouTube search terms that led to your videos",
  },
  {
    label: "🔍 External Traffic Sources (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==EXT_URL&sort=-views&maxResults=25`,
    method: "GET",
    description: "External websites sending traffic to your channel",
  },
  {
    label: "🔍 Suggested Video Sources (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=insightTrafficSourceDetail&filters=insightTrafficSourceType==RELATED_VIDEO&sort=-views&maxResults=25`,
    method: "GET",
    description: "Videos that suggested your content",
  },

  // ============================================================================
  // Audience Demographics
  // ============================================================================
  {
    label: "🌍 Geographic Analytics (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration&dimensions=country&sort=-views&maxResults=25`,
    method: "GET",
    description: "Get top 25 countries by viewership with watch metrics",
  },
  {
    label: "👥 Age & Gender (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=viewerPercentage&dimensions=ageGroup,gender&sort=-viewerPercentage`,
    method: "GET",
    description: "Viewer demographics by age and gender",
  },
  {
    label: "📱 Device Analytics (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=deviceType&sort=-views`,
    method: "GET",
    description: "Views and watch time by device type",
  },
  {
    label: "🖥️ Operating System (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views&dimensions=operatingSystem&sort=-views`,
    method: "GET",
    description: "Views by operating system",
  },

  // ============================================================================
  // Playlist Analytics
  // ============================================================================
  {
    label: "📋 Playlist Performance (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,playlistStarts,averageTimeInPlaylist&dimensions=playlist&sort=-views&maxResults=25`,
    method: "GET",
    description: "Get playlist performance metrics",
  },

  // ============================================================================
  // Cards & End Screens
  // ============================================================================
  {
    label: "🎴 Card Performance (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=cardImpressions,cardClicks,cardClickRate&dimensions=card&sort=-cardClicks&maxResults=25`,
    method: "GET",
    description: "Card click-through performance across videos",
  },
  {
    label: "🔚 End Screen Performance (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=endScreenElementImpressions,endScreenElementClicks,endScreenElementClickRate&dimensions=endScreenElementType&sort=-endScreenElementClicks`,
    method: "GET",
    description: "End screen element performance by type",
  },

  // ============================================================================
  // Video-specific Reports (requires VIDEO_ID parameter)
  // ============================================================================
  {
    label: "🎥 Video Analytics (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,averageViewDuration,likes,comments,shares,subscribersGained&filters=video=={VIDEO_ID}`,
    method: "GET",
    description: "Get detailed analytics for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
  {
    label: "🎥 Video Daily Stats (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched,likes&dimensions=day&filters=video=={VIDEO_ID}`,
    method: "GET",
    description: "Daily breakdown for a specific video (for plotting)",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
  {
    label: "🎥 Video Traffic Sources",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=insightTrafficSourceType&filters=video=={VIDEO_ID}&sort=-views`,
    method: "GET",
    description: "Analyze traffic sources for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
  {
    label: "🎥 Video Geographic (28 Days)",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=views,estimatedMinutesWatched&dimensions=country&filters=video=={VIDEO_ID}&sort=-views&maxResults=25`,
    method: "GET",
    description: "Geographic distribution for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },
  {
    label: "🎥 Video Audience Retention",
    path: `/v2/reports?ids=channel==MINE&startDate=${last28Days.startDate}&endDate=${last28Days.endDate}&metrics=audienceWatchRatio&dimensions=elapsedVideoTimeRatio&filters=video=={VIDEO_ID}`,
    method: "GET",
    description: "Audience retention curve for a specific video",
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
