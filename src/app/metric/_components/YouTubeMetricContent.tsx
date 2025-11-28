"use client";

import { useEffect, useMemo, useState } from "react";

import { Check, Loader2, Sparkles } from "lucide-react";

import { getTemplate } from "@/app/metric/registry";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
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

import { useApiToChartTransformer } from "../_hooks/use-api-to-chart-transformer";
import type { ContentProps } from "./MetricDialogBase";

type ScopeType = "channel" | "video";
type MetricType = "views" | "likes" | "subscribers";

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

function getTemplateId(scopeType: ScopeType, metricType: MetricType): string {
  return `youtube-${scopeType}-${metricType}-timeseries`;
}

export function YouTubeMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [scopeType, setScopeType] = useState<ScopeType | "">("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [metricType, setMetricType] = useState<MetricType | "">("");
  const [metricName, setMetricName] = useState("");

  // Fetch videos for dropdown
  const { data: videosData, isLoading: isLoadingVideos } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "youtube",
        endpoint:
          "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
        method: "GET",
      },
      {
        enabled: !!connection && scopeType === "video",
        staleTime: 5 * 60 * 1000,
      },
    );

  const videoOptions = useMemo(() => {
    if (!videosData?.data) return [];
    return transformVideos(videosData.data);
  }, [videosData]);

  const templateId =
    scopeType && metricType ? getTemplateId(scopeType, metricType) : null;
  const template = templateId ? getTemplate(templateId) : null;

  const endpointParams = useMemo((): Record<string, string> => {
    if (scopeType === "video" && selectedVideoId) {
      return { VIDEO_ID: selectedVideoId };
    }
    return {};
  }, [scopeType, selectedVideoId]);

  const isReadyForPrefetch =
    !!scopeType &&
    !!metricType &&
    !!metricName &&
    (scopeType === "channel" || (scopeType === "video" && !!selectedVideoId));

  // Use unified transform hook
  const transformer = useApiToChartTransformer({
    connectionId: connection.connectionId,
    integrationId: "youtube",
    template: template ?? null,
    endpointParams,
    metricName,
    metricDescription:
      scopeType && metricType
        ? getMetricDescription(metricType, scopeType)
        : undefined,
    enabled: isReadyForPrefetch,
  });

  const handleScopeChange = (value: ScopeType) => {
    setScopeType(value);
    setSelectedVideoId("");
    setMetricType("");
    setMetricName("");
    transformer.reset();
  };

  const handleMetricTypeChange = (value: MetricType) => {
    setMetricType(value);
    transformer.reset();
  };

  const handleVideoChange = (value: string) => {
    setSelectedVideoId(value);
    transformer.reset();
  };

  // Auto-generate metric name
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
    if (!scopeType || !metricType || !metricName || !templateId) return;
    if (scopeType === "video" && !selectedVideoId) return;

    onSubmit({
      templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: getMetricDescription(metricType, scopeType),
      endpointParams,
    });
  };

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

  const isFetching = transformer.status === "fetching" || transformer.isLoading;
  const isTransforming =
    transformer.status === "transforming" || transformer.isTransforming;
  const isChartReady = !!transformer.chartData;
  const isDataReady =
    transformer.status === "ready" && transformer.rawData && !isChartReady;

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="scope">Scope</Label>
          <Select
            value={scopeType}
            onValueChange={(value) => handleScopeChange(value as ScopeType)}
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

        {scopeType === "video" && (
          <div className="space-y-2">
            <Label htmlFor="video">Select Video</Label>
            <Select
              value={selectedVideoId}
              onValueChange={handleVideoChange}
              disabled={isLoadingVideos || videoOptions.length === 0}
            >
              <SelectTrigger id="video">
                <SelectValue
                  placeholder={
                    isLoadingVideos ? "Loading videos..." : "Choose a video"
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

        {scopeType && (
          <div className="space-y-2">
            <Label htmlFor="metric">Metric Type</Label>
            <Select
              value={metricType}
              onValueChange={(value) =>
                handleMetricTypeChange(value as MetricType)
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

        {isFormValid && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {isFetching && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Fetching data...</span>
              </>
            )}
            {isDataReady && !isTransforming && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Data ready</span>
              </>
            )}
            {isTransforming && (
              <>
                <Sparkles className="h-3 w-3 animate-pulse text-blue-500" />
                <span className="text-blue-500">AI analyzing...</span>
              </>
            )}
            {isChartReady && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">
                  Chart ready - instant create!
                </span>
              </>
            )}
            {transformer.status === "error" && (
              <span className="text-amber-600">Will fetch on create</span>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button onClick={handleCreate} disabled={!isFormValid || isCreating}>
          {isCreating ? "Creating..." : "Create Metric"}
        </Button>
      </DialogFooter>
    </>
  );
}
