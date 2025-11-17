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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

interface YouTubeMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

type MetricTemplateId =
  | "youtube-channel-subscribers"
  | "youtube-channel-views"
  | "youtube-video-views"
  | "youtube-video-likes";

export function YouTubeMetricCreator({
  connectionId,
  onSuccess,
}: YouTubeMetricCreatorProps) {
  const [metricType, setMetricType] = useState<"channel" | "video">("channel");
  const [templateId, setTemplateId] = useState<MetricTemplateId>(
    "youtube-channel-subscribers",
  );
  const [videoId, setVideoId] = useState("");
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

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
    if (type === "channel") {
      setTemplateId("youtube-channel-subscribers");
    } else {
      setTemplateId("youtube-video-views");
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
        <CardContent>
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

            <TabsContent value="channel" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="channel-template">Select Metric</Label>
                <Tabs
                  value={templateId}
                  onValueChange={(v) => setTemplateId(v as MetricTemplateId)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="youtube-channel-subscribers">
                      Subscribers
                    </TabsTrigger>
                    <TabsTrigger value="youtube-channel-views">
                      Total Views
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <p className="text-muted-foreground text-sm">
                These metrics track your entire channel performance
              </p>
            </TabsContent>

            <TabsContent value="video" className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="video-template">Select Metric</Label>
                <Tabs
                  value={templateId}
                  onValueChange={(v) => setTemplateId(v as MetricTemplateId)}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="youtube-video-views">Views</TabsTrigger>
                    <TabsTrigger value="youtube-video-likes">Likes</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-2">
                <Label htmlFor="video-id">Video ID *</Label>
                <Input
                  id="video-id"
                  placeholder="e.g., dQw4w9WgXcQ"
                  value={videoId}
                  onChange={(e) => setVideoId(e.target.value)}
                />
                <p className="text-muted-foreground text-xs">
                  The video ID from the YouTube URL (after v=)
                </p>
              </div>
            </TabsContent>
          </Tabs>
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
