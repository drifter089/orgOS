"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

interface YouTubeMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

// Channel metric templates
const channelLifetimeTemplates = [
  {
    id: "youtube-channel-subscribers",
    label: "Subscribers",
    description: "Total subscriber count",
  },
  {
    id: "youtube-channel-views",
    label: "Total Views",
    description: "Lifetime view count",
  },
  {
    id: "youtube-channel-video-count",
    label: "Video Count",
    description: "Total number of videos",
  },
];

const channelAnalyticsTemplates = [
  {
    id: "youtube-channel-daily-views-28d",
    label: "Daily Views (28d)",
    description: "Daily view counts for plotting",
  },
  {
    id: "youtube-channel-daily-watch-time-28d",
    label: "Daily Watch Time (28d)",
    description: "Daily minutes watched",
  },
  {
    id: "youtube-channel-daily-avg-duration-28d",
    label: "Daily Avg Duration (28d)",
    description: "Daily average view duration",
  },
  {
    id: "youtube-channel-daily-subscribers-28d",
    label: "Daily Subscribers (28d)",
    description: "Daily gains/losses",
  },
  {
    id: "youtube-channel-daily-engagement-28d",
    label: "Daily Engagement (28d)",
    description: "Daily likes, comments, shares",
  },
  {
    id: "youtube-top-videos-by-views-28d",
    label: "Top Videos by Views",
    description: "Top 25 videos ranked by views",
  },
  {
    id: "youtube-top-videos-by-watch-time-28d",
    label: "Top Videos by Watch Time",
    description: "Top 25 videos ranked by watch time",
  },
  {
    id: "youtube-traffic-sources-28d",
    label: "Traffic Sources",
    description: "Where views come from",
  },
  {
    id: "youtube-geographic-28d",
    label: "Geographic Breakdown",
    description: "Views by country",
  },
  {
    id: "youtube-device-28d",
    label: "Device Breakdown",
    description: "Views by device type",
  },
];

// Video metric templates
const videoLifetimeTemplates = [
  {
    id: "youtube-video-views",
    label: "Views",
    description: "Total view count",
  },
  {
    id: "youtube-video-likes",
    label: "Likes",
    description: "Total likes",
  },
  {
    id: "youtube-video-comments",
    label: "Comments",
    description: "Total comments",
  },
];

const videoAnalyticsTemplates = [
  {
    id: "youtube-video-daily-views-28d",
    label: "Daily Views (28d)",
    description: "Daily view counts for plotting",
  },
  {
    id: "youtube-video-daily-watch-time-28d",
    label: "Daily Watch Time (28d)",
    description: "Daily minutes watched",
  },
  {
    id: "youtube-video-daily-engagement-28d",
    label: "Daily Engagement (28d)",
    description: "Daily likes, comments, shares",
  },
];

export function YouTubeMetricCreator({
  connectionId,
  onSuccess,
}: YouTubeMetricCreatorProps) {
  const [metricType, setMetricType] = useState<"channel" | "video">("channel");
  const [metricCategory, setMetricCategory] = useState<
    "lifetime" | "analytics"
  >("lifetime");
  const [templateId, setTemplateId] = useState("youtube-channel-subscribers");
  const [videoId, setVideoId] = useState("");
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  // Fetch user's videos for the dropdown
  const videosQuery = api.youtube.getMyVideos.useQuery(
    { connectionId, maxResults: 50 },
    {
      enabled: metricType === "video",
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    },
  );

  // Create metric mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      setVideoId("");
      setMetricName("");
      setTargetValue("");
      onSuccess?.();
    },
  });

  const handleMetricTypeChange = (type: "channel" | "video") => {
    setMetricType(type);
    setMetricCategory("lifetime");
    if (type === "channel") {
      setTemplateId("youtube-channel-subscribers");
    } else {
      setTemplateId("youtube-video-views");
    }
    setVideoId("");
  };

  const handleCategoryChange = (category: "lifetime" | "analytics") => {
    setMetricCategory(category);
    if (metricType === "channel") {
      setTemplateId(
        category === "lifetime"
          ? "youtube-channel-subscribers"
          : "youtube-channel-daily-views-28d",
      );
    } else {
      setTemplateId(
        category === "lifetime"
          ? "youtube-video-views"
          : "youtube-video-daily-views-28d",
      );
    }
  };

  const handleCreate = () => {
    const params =
      metricType === "video" && videoId ? { VIDEO_ID: videoId } : undefined;

    createMutation.mutate({
      templateId,
      connectionId,
      name: metricName || undefined,
      targetValue: targetValue ? parseFloat(targetValue) : undefined,
      endpointParams: params,
    });
  };

  const canCreate =
    metricType === "channel" || (metricType === "video" && videoId);

  // Get current template options based on selections
  const currentTemplates =
    metricType === "channel"
      ? metricCategory === "lifetime"
        ? channelLifetimeTemplates
        : channelAnalyticsTemplates
      : metricCategory === "lifetime"
        ? videoLifetimeTemplates
        : videoAnalyticsTemplates;

  return (
    <div className="space-y-6">
      {/* Metric Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Metric Type</CardTitle>
          <CardDescription>
            Choose whether to track channel or video metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs
            value={metricType}
            onValueChange={(v) =>
              handleMetricTypeChange(v as typeof metricType)
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="channel">Channel Metrics</TabsTrigger>
              <TabsTrigger value="video">Video Metrics</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Category Selection */}
          <div className="space-y-2">
            <Label>Metric Category</Label>
            <Tabs
              value={metricCategory}
              onValueChange={(v) =>
                handleCategoryChange(v as typeof metricCategory)
              }
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="lifetime">Lifetime</TabsTrigger>
                <TabsTrigger value="analytics">Last 28 Days</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Template Selection */}
          <div className="space-y-2">
            <Label>Select Metric</Label>
            <Select value={templateId} onValueChange={setTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a metric..." />
              </SelectTrigger>
              <SelectContent>
                {currentTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    <div className="flex flex-col">
                      <span>{template.label}</span>
                      <span className="text-muted-foreground text-xs">
                        {template.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Video Selection (only for video metrics) */}
          {metricType === "video" && (
            <div className="space-y-2">
              <Label htmlFor="video-select">Select Video *</Label>
              {videosQuery.isLoading ? (
                <div className="text-muted-foreground text-sm">
                  Loading your videos...
                </div>
              ) : videosQuery.error ? (
                <div className="text-sm text-red-600">
                  Error loading videos: {videosQuery.error.message}
                </div>
              ) : videosQuery.data?.options.length === 0 ? (
                <div className="text-muted-foreground text-sm">
                  No videos found on your channel
                </div>
              ) : (
                <Select value={videoId} onValueChange={setVideoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a video..." />
                  </SelectTrigger>
                  <SelectContent>
                    {videosQuery.data?.options.map((video) => (
                      <SelectItem key={video.value} value={video.value}>
                        <div className="flex items-center gap-2">
                          {video.thumbnail && (
                            <img
                              src={video.thumbnail}
                              alt=""
                              className="h-6 w-10 rounded object-cover"
                            />
                          )}
                          <div className="flex flex-col">
                            <span className="max-w-[250px] truncate">
                              {video.label}
                            </span>
                            {video.publishedAt && (
                              <span className="text-muted-foreground text-xs">
                                {new Date(
                                  video.publishedAt,
                                ).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <p className="text-muted-foreground text-xs">
                Select a video from your channel to track its metrics
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Metric Configuration */}
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Metric</CardTitle>
            <CardDescription>
              Customize your metric name and target value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name (Optional)</Label>
              <Input
                id="metric-name"
                placeholder="Leave empty to use default name"
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Value (Optional)</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                placeholder="e.g., 10000"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!canCreate || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Creating..." : "Create Metric"}
            </Button>

            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {createMutation.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
