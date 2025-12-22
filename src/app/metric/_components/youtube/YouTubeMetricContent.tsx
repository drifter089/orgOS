"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

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
import { getTemplate } from "@/lib/integrations";
import { api } from "@/trpc/react";

import type { ContentProps } from "../base/MetricDialogBase";

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

function getTemplateData(
  scopeType: string,
  metricType: string,
): { label: string; description: string } {
  const templateId = `youtube-${scopeType}-${metricType}-timeseries`;
  const template = getTemplate(templateId);
  return {
    label: template?.label ?? "",
    description: template?.description ?? "",
  };
}

function getTemplateId(scopeType: string, metricType: string): string {
  return `youtube-${scopeType}-${metricType}-timeseries`;
}

export function YouTubeMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [scopeType, setScopeType] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState("");
  const [metricType, setMetricType] = useState("");
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

  const endpointParams = useMemo((): Record<string, string> => {
    if (scopeType === "video" && selectedVideoId) {
      return { VIDEO_ID: selectedVideoId };
    }
    return {};
  }, [scopeType, selectedVideoId]);

  const handleScopeChange = (value: string) => {
    setScopeType(value);
    setSelectedVideoId("");
    setMetricType("");
    setMetricName("");
  };

  // Auto-generate metric name
  useEffect(() => {
    if (metricType && scopeType) {
      const videoName =
        scopeType === "video" && selectedVideoId
          ? videoOptions.find((v) => v.value === selectedVideoId)?.label
          : "";

      const { label } = getTemplateData(scopeType, metricType);
      const name = videoName ? `${videoName} - ${metricType}` : label;
      setMetricName(name);
    }
  }, [metricType, scopeType, selectedVideoId, videoOptions]);

  const handleCreate = () => {
    if (!scopeType || !metricType || !metricName || !templateId) return;
    if (scopeType === "video" && !selectedVideoId) return;

    const { description } = getTemplateData(scopeType, metricType);

    void onSubmit({
      templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description,
      endpointParams,
    });
  };

  const availableMetrics =
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

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="scope">Scope</Label>
          <Select value={scopeType} onValueChange={handleScopeChange}>
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
              onValueChange={setSelectedVideoId}
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
            <Select value={metricType} onValueChange={setMetricType}>
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
            {metricType && scopeType && (
              <p className="text-muted-foreground text-sm">
                {getTemplateData(scopeType, metricType).description}
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
      </div>

      <DialogFooter>
        <Button onClick={handleCreate} disabled={!isFormValid || isCreating}>
          {isCreating ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Metric"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
