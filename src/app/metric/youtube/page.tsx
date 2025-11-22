"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

// =============================================================================
// Types
// =============================================================================

type ScopeType = "channel" | "video";

type MetricType = "views" | "likes" | "subscribers";

interface VideoOption {
  label: string;
  value: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function transformVideos(
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

function getMetricLabel(metricType: MetricType, scopeType: ScopeType): string {
  if (scopeType === "channel") {
    switch (metricType) {
      case "views":
        return "Channel Views (Time Series)";
      case "likes":
        return "Channel Likes (Time Series)";
      case "subscribers":
        return "Subscribers Gained (Time Series)";
    }
  } else {
    switch (metricType) {
      case "views":
        return "Video Views (Time Series)";
      case "likes":
        return "Video Likes (Time Series)";
      default:
        return "";
    }
  }
}

function getMetricDescription(
  metricType: MetricType,
  scopeType: ScopeType,
): string {
  if (scopeType === "channel") {
    switch (metricType) {
      case "views":
        return "Daily view counts for your entire channel";
      case "likes":
        return "Daily likes across all your videos";
      case "subscribers":
        return "Daily subscriber growth for your channel";
    }
  } else {
    switch (metricType) {
      case "views":
        return "Daily view counts for this specific video";
      case "likes":
        return "Daily likes for this specific video";
      default:
        return "";
    }
  }
}

// =============================================================================
// YouTube Metrics Creation Dialog
// =============================================================================

export default function YouTubeMetricsPage() {
  const [open, setOpen] = useState(false);
  const [scopeType, setScopeType] = useState<ScopeType | "">("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [metricType, setMetricType] = useState<MetricType | "">("");
  const [metricName, setMetricName] = useState("");
  const [videoOptions, setVideoOptions] = useState<VideoOption[]>([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      // Reset form
      setScopeType("");
      setSelectedVideoId("");
      setMetricType("");
      setMetricName("");
      setVideoOptions([]);
      setOpen(false);
    },
  });

  const fetchVideos = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformVideos(data.data);
      setVideoOptions(options);
    },
  });

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "youtube",
  );

  // Fetch videos when "video" scope is selected
  useEffect(() => {
    if (scopeType === "video" && connection && videoOptions.length === 0) {
      fetchVideos.mutate({
        connectionId: connection.connectionId,
        integrationId: "youtube",
        endpoint:
          "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
        method: "GET",
        params: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeType, connection]);

  // Reset selections when scope changes
  const handleScopeChange = (value: ScopeType) => {
    setScopeType(value);
    setSelectedVideoId("");
    setMetricType("");
    setMetricName("");
  };

  // Auto-generate metric name when metric type is selected
  useEffect(() => {
    if (metricType && scopeType) {
      const videoName =
        scopeType === "video" && selectedVideoId
          ? videoOptions.find((v) => v.value === selectedVideoId)?.label
          : "";

      const baseName = getMetricLabel(metricType, scopeType);
      const name = videoName ? `${videoName} - ${metricType}` : baseName;
      setMetricName(name);
    }
  }, [metricType, scopeType, selectedVideoId, videoOptions]);

  const handleCreate = () => {
    if (!connection || !scopeType || !metricType || !metricName) return;

    // For video scope, ensure video is selected
    if (scopeType === "video" && !selectedVideoId) return;

    createMetric.mutate({
      templateId: `youtube-${scopeType}-${metricType}-timeseries`,
      connectionId: connection.connectionId,
      name: metricName,
      description: getMetricDescription(metricType, scopeType),
      endpointParams:
        scopeType === "video" ? { VIDEO_ID: selectedVideoId } : {},
    });
  };

  // Available metrics based on scope
  const availableMetrics: MetricType[] =
    scopeType === "channel"
      ? ["views", "likes", "subscribers"]
      : scopeType === "video"
        ? ["views", "likes"]
        : [];

  const isFormValid =
    scopeType &&
    metricType &&
    metricName &&
    (scopeType === "channel" || (scopeType === "video" && selectedVideoId));

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No YouTube Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your YouTube account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>YouTube Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create YouTube Metric</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create YouTube Metric</DialogTitle>
              <DialogDescription>
                Track views, likes, and subscribers over time for your channel
                or specific videos.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Scope Selection: Channel or Video */}
              <div className="space-y-2">
                <Label htmlFor="scope">Scope</Label>
                <Select
                  value={scopeType}
                  onValueChange={(value) =>
                    handleScopeChange(value as ScopeType)
                  }
                >
                  <SelectTrigger id="scope">
                    <SelectValue placeholder="Select channel or specific video" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="channel">Entire Channel</SelectItem>
                    <SelectItem value="video">Specific Video</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Video Selection (only shown when scope is "video") */}
              {scopeType === "video" && (
                <div className="space-y-2">
                  <Label htmlFor="video">Select Video</Label>
                  <Select
                    value={selectedVideoId}
                    onValueChange={setSelectedVideoId}
                    disabled={videoOptions.length === 0}
                  >
                    <SelectTrigger id="video">
                      <SelectValue
                        placeholder={
                          fetchVideos.isPending
                            ? "Loading videos..."
                            : "Choose a video"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {videoOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Metric Type Selection */}
              {scopeType && (
                <div className="space-y-2">
                  <Label htmlFor="metric">Metric Type</Label>
                  <Select
                    value={metricType}
                    onValueChange={(value) =>
                      setMetricType(value as MetricType)
                    }
                  >
                    <SelectTrigger id="metric">
                      <SelectValue placeholder="Select metric type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMetrics.map((metric) => (
                        <SelectItem key={metric} value={metric}>
                          {metric.charAt(0).toUpperCase() + metric.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {metricType && (
                    <p className="text-muted-foreground text-sm">
                      {getMetricDescription(metricType, scopeType)}
                    </p>
                  )}
                </div>
              )}

              {/* Metric Name */}
              {metricType && (
                <div className="space-y-2">
                  <Label htmlFor="name">Metric Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., My Channel Views"
                    value={metricName}
                    onChange={(e) => setMetricName(e.target.value)}
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={createMetric.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!isFormValid || createMetric.isPending}
              >
                {createMetric.isPending ? "Creating..." : "Create Metric"}
              </Button>
            </DialogFooter>

            {createMetric.isError && (
              <p className="text-destructive text-sm">
                Error: {createMetric.error.message}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
