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
  // ===== Channel Time-Series Metrics (YouTube Analytics API v2) =====
  {
    templateId: "youtube-channel-views-timeseries",
    label: "Channel Views (Time Series)",
    description: "Daily view counts for your entire channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",

    metricEndpoint:
      "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=day&startDate=28daysAgo&endDate=today",

    // Architecture config
    historicalDataLimit: "28d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    requiredParams: [],
  },
  {
    templateId: "youtube-channel-likes-timeseries",
    label: "Channel Likes (Time Series)",
    description: "Daily likes across all your videos",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "likes",

    metricEndpoint:
      "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=likes&dimensions=day&startDate=28daysAgo&endDate=today",

    // Architecture config
    historicalDataLimit: "28d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    requiredParams: [],
  },
  {
    templateId: "youtube-channel-subscribers-timeseries",
    label: "Subscribers Gained (Time Series)",
    description: "Daily subscriber growth for your channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "subscribers",

    metricEndpoint:
      "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=subscribersGained&dimensions=day&startDate=28daysAgo&endDate=today",

    // Architecture config
    historicalDataLimit: "28d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    requiredParams: [],
  },

  // ===== Video Time-Series Metrics (YouTube Analytics API v2) =====
  {
    templateId: "youtube-video-views-timeseries",
    label: "Video Views (Time Series)",
    description: "Daily view counts for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",

    metricEndpoint:
      "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=views&dimensions=day&startDate=28daysAgo&endDate=today&filters=video=={VIDEO_ID}",

    // Architecture config
    historicalDataLimit: "28d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

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
  {
    templateId: "youtube-video-likes-timeseries",
    label: "Video Likes (Time Series)",
    description: "Daily likes for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "likes",

    metricEndpoint:
      "https://youtubeanalytics.googleapis.com/v2/reports?ids=channel==MINE&metrics=likes&dimensions=day&startDate=28daysAgo&endDate=today&filters=video=={VIDEO_ID}",

    // Architecture config
    historicalDataLimit: "28d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

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
