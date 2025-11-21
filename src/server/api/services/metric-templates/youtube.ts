import type { MetricTemplate } from "../base";

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

    dropdowns: [
      {
        paramName: "VIDEO_ID",
        endpoint:
          "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
        transform: (data: unknown) =>
          (
            data as {
              items?: Array<{
                snippet: { title: string };
                id: { videoId: string };
              }>;
            }
          ).items?.map((video) => ({
            label: video.snippet.title,
            value: video.id.videoId,
          })) ?? [],
      },
    ],

    metricEndpoint: "/youtube/v3/videos?part=statistics&id={VIDEO_ID}",

    requiredParams: [
      {
        name: "VIDEO_ID",
        label: "Select Video",
        description: "Select a video from your channel",
        type: "dynamic-select",
        required: true,
        dynamicOptionsKey: "VIDEO_ID",
      },
    ],
  },
];
