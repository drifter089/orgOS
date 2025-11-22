/**
 * YouTube Router
 *
 * Provides endpoints for fetching YouTube data for UI components,
 * such as video lists for dropdown selectors.
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { fetchData } from "@/server/api/services/integrations/base";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { getIntegrationAndVerifyAccess } from "@/server/api/utils/authorization";

interface YouTubeVideoItem {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    description: string;
    publishedAt: string;
    thumbnails: {
      default?: { url: string };
      medium?: { url: string };
    };
  };
}

interface YouTubeSearchResponse {
  items: YouTubeVideoItem[];
  pageInfo: {
    totalResults: number;
    resultsPerPage: number;
  };
  nextPageToken?: string;
}

export const youtubeRouter = createTRPCRouter({
  /**
   * Get the user's uploaded videos for dropdown selection
   * Returns videos in a format suitable for dynamic-select parameters
   */
  getMyVideos: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        maxResults: z.number().min(1).max(50).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify access to the integration
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.integrationId !== "youtube") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This endpoint only works with YouTube integrations",
        });
      }

      if (integration.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Integration is ${integration.status}. Please reconnect.`,
        });
      }

      try {
        // Fetch user's uploaded videos using YouTube Data API
        const result = await fetchData(
          "youtube",
          input.connectionId,
          `/youtube/v3/search?part=snippet&forMine=true&type=video&order=date&maxResults=${input.maxResults}`,
        );

        const data = result.data as YouTubeSearchResponse;

        // Transform to dropdown options format
        const options = (data.items || []).map((video) => ({
          label: video.snippet.title,
          value: video.id.videoId,
          description: video.snippet.description?.substring(0, 100) || "",
          publishedAt: video.snippet.publishedAt,
          thumbnail: video.snippet.thumbnails?.default?.url || "",
        }));

        return {
          options,
          totalResults: data.pageInfo?.totalResults || options.length,
        };
      } catch (error) {
        console.error("[YouTube getMyVideos] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch videos from YouTube",
        });
      }
    }),

  /**
   * Get the user's playlists for dropdown selection
   */
  getMyPlaylists: workspaceProcedure
    .input(
      z.object({
        connectionId: z.string(),
        maxResults: z.number().min(1).max(50).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.integrationId !== "youtube") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This endpoint only works with YouTube integrations",
        });
      }

      if (integration.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Integration is ${integration.status}. Please reconnect.`,
        });
      }

      try {
        const result = await fetchData(
          "youtube",
          input.connectionId,
          `/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=${input.maxResults}`,
        );

        interface PlaylistItem {
          id: string;
          snippet: {
            title: string;
            description: string;
          };
          contentDetails: {
            itemCount: number;
          };
        }

        const data = result.data as { items: PlaylistItem[] };

        const options = (data.items || []).map((playlist) => ({
          label: playlist.snippet.title,
          value: playlist.id,
          description: `${playlist.contentDetails?.itemCount || 0} videos`,
        }));

        return { options };
      } catch (error) {
        console.error("[YouTube getMyPlaylists] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch playlists from YouTube",
        });
      }
    }),

  /**
   * Get channel info for the connected account
   */
  getChannelInfo: workspaceProcedure
    .input(z.object({ connectionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const integration = await getIntegrationAndVerifyAccess(
        ctx.db,
        input.connectionId,
        ctx.user.id,
        ctx.workspace,
      );

      if (integration.integrationId !== "youtube") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This endpoint only works with YouTube integrations",
        });
      }

      if (integration.status !== "active") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Integration is ${integration.status}. Please reconnect.`,
        });
      }

      try {
        const result = await fetchData(
          "youtube",
          input.connectionId,
          "/youtube/v3/channels?part=snippet,statistics&mine=true",
        );

        interface ChannelItem {
          id: string;
          snippet: {
            title: string;
            description: string;
            thumbnails: {
              default?: { url: string };
            };
          };
          statistics: {
            viewCount: string;
            subscriberCount: string;
            videoCount: string;
          };
        }

        const data = result.data as { items: ChannelItem[] };
        const channel = data.items?.[0];

        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No YouTube channel found for this account",
          });
        }

        return {
          id: channel.id,
          title: channel.snippet.title,
          description: channel.snippet.description,
          thumbnail: channel.snippet.thumbnails?.default?.url || "",
          statistics: {
            viewCount: parseInt(channel.statistics.viewCount || "0", 10),
            subscriberCount: parseInt(
              channel.statistics.subscriberCount || "0",
              10,
            ),
            videoCount: parseInt(channel.statistics.videoCount || "0", 10),
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[YouTube getChannelInfo] Error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Failed to fetch channel info from YouTube",
        });
      }
    }),
});
