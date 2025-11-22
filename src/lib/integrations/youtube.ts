/**
 * YouTube Integration Registry
 * Single source of truth for all YouTube-related configurations
 */
import type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

// =============================================================================
// Metadata
// =============================================================================

export const name = "YouTube";
export const integrationId = "youtube";
export const baseUrl = "https://www.googleapis.com";

// =============================================================================
// Metric Templates
// =============================================================================

export const templates: MetricTemplate[] = [
  // ===== Channel Metrics =====
  {
    templateId: "youtube-channel-subscribers",
    label: "Channel Subscribers",
    description: "Total subscriber count for your channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "subscribers",

    metricEndpoint: "/youtube/v3/channels?part=statistics&mine=true",

    requiredParams: [],
  },
  {
    templateId: "youtube-channel-views",
    label: "Channel Total Views",
    description: "Lifetime view count across all videos",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",

    metricEndpoint: "/youtube/v3/channels?part=statistics&mine=true",

    requiredParams: [],
  },
  {
    templateId: "youtube-channel-video-count",
    label: "Channel Video Count",
    description: "Total number of videos on your channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "videos",

    metricEndpoint: "/youtube/v3/channels?part=statistics&mine=true",

    requiredParams: [],
  },

  // ===== Video Metrics =====
  {
    templateId: "youtube-video-views",
    label: "Video Views (Lifetime)",
    description: "Total view count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",

    metricEndpoint: "/youtube/v3/videos?part=statistics&id={VIDEO_ID}",

    requiredParams: [
      {
        name: "VIDEO_ID",
        label: "Select Video",
        description: "Select a video from your channel",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a video",
        dynamicConfig: {
          endpoint:
            "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
          method: "GET",
        },
      },
    ],
  },
];

// =============================================================================
// Data Transformations
// =============================================================================

/**
 * Transform YouTube videos API response to dropdown options
 */
export function transformVideos(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    items?: Array<{
      snippet: { title: string };
      id: { videoId: string };
    }>;
  };

  return (
    response.items?.map((video) => ({
      label: video.snippet.title,
      value: video.id.videoId,
    })) ?? []
  );
}

/**
 * Transform YouTube channel statistics to extract subscriber count
 */
export function transformChannelSubscribers(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    items?: Array<{
      statistics: { subscriberCount: string };
    }>;
  };

  const subscriberCount =
    response.items?.[0]?.statistics?.subscriberCount ?? "0";
  return parseInt(subscriberCount, 10);
}

/**
 * Transform YouTube channel statistics to extract total views
 */
export function transformChannelViews(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    items?: Array<{
      statistics: { viewCount: string };
    }>;
  };

  const viewCount = response.items?.[0]?.statistics?.viewCount ?? "0";
  return parseInt(viewCount, 10);
}

/**
 * Transform YouTube channel statistics to extract video count
 */
export function transformChannelVideoCount(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    items?: Array<{
      statistics: { videoCount: string };
    }>;
  };

  const videoCount = response.items?.[0]?.statistics?.videoCount ?? "0";
  return parseInt(videoCount, 10);
}

/**
 * Transform YouTube video statistics to extract view count
 */
export function transformVideoViews(data: unknown): number {
  if (!data || typeof data !== "object") return 0;

  const response = data as {
    items?: Array<{
      statistics: { viewCount: string };
    }>;
  };

  const viewCount = response.items?.[0]?.statistics?.viewCount ?? "0";
  return parseInt(viewCount, 10);
}

/**
 * Registry of all YouTube transformation functions
 */
export const transforms = {
  videos: transformVideos,
  channelSubscribers: transformChannelSubscribers,
  channelViews: transformChannelViews,
  channelVideoCount: transformChannelVideoCount,
  videoViews: transformVideoViews,
};

// =============================================================================
// API Endpoints (for testing/debugging)
// =============================================================================

export const endpoints: Endpoint[] = [
  // ===== Channel =====
  {
    label: "My Channel Statistics",
    path: "/youtube/v3/channels?part=statistics&mine=true",
    method: "GET",
    description: "Get channel statistics (subscribers, views, video count)",
  },
  {
    label: "My Videos",
    path: "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
    method: "GET",
    description: "List videos on your channel",
  },

  // ===== Video Stats =====
  {
    label: "Video Statistics",
    path: "/youtube/v3/videos?part=statistics&id={VIDEO_ID}",
    method: "GET",
    description: "Get statistics for a specific video",
    requiresParams: true,
    params: ["VIDEO_ID"],
  },

  // ===== YouTube Analytics API =====
  {
    label: "Channel Analytics - Daily Views (28d)",
    path: "/youtube/analytics/v1/reports?ids=channel==MINE&metrics=views&dimensions=day&startDate=28daysAgo&endDate=today",
    method: "GET",
    description: "Daily view counts for last 28 days",
  },
  {
    label: "Channel Analytics - Watch Time (28d)",
    path: "/youtube/analytics/v1/reports?ids=channel==MINE&metrics=estimatedMinutesWatched&dimensions=day&startDate=28daysAgo&endDate=today",
    method: "GET",
    description: "Daily watch time for last 28 days",
  },
];

export const exampleParams = {
  VIDEO_ID: "dQw4w9WgXcQ",
};

// =============================================================================
// Service Config (for api-test)
// =============================================================================

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
