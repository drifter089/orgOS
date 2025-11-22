/**
 * Data transformation functions for YouTube API responses
 * These functions transform API data into formats suitable for UI display
 */

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
export const YOUTUBE_TRANSFORMS = {
  videos: transformVideos,
  channelSubscribers: transformChannelSubscribers,
  channelViews: transformChannelViews,
  channelVideoCount: transformChannelVideoCount,
  videoViews: transformVideoViews,
};
