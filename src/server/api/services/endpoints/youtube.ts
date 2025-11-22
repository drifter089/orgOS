import type { Endpoint, ServiceConfig } from "@/lib/metrics/types";

export const name = "YouTube";
export const integrationId = "youtube";
export const baseUrl = "https://www.googleapis.com";

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

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
