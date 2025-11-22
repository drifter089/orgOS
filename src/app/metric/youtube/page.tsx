"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { templates } from "@/lib/integrations/youtube";
import { api } from "@/trpc/react";

// =============================================================================
// Transform Functions (moved from lib/integrations/youtube.ts)
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

// =============================================================================
// YouTube Metrics Creation Page
// =============================================================================

export default function YouTubeMetricsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [metricName, setMetricName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [videoOptions, setVideoOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setSelectedTemplateId("");
      setMetricName("");
      setParams({});
      setVideoOptions([]);
    },
  });

  const fetchVideos = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformVideos(data.data);
      setVideoOptions(options);
    },
  });

  const selectedTemplate = templates.find(
    (t) => t.templateId === selectedTemplateId,
  );

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "youtube",
  );

  // Fetch videos when template with VIDEO_ID param is selected
  useEffect(() => {
    if (
      selectedTemplate?.requiredParams.some((p) => p.name === "VIDEO_ID") &&
      connection &&
      videoOptions.length === 0
    ) {
      fetchVideos.mutate({
        connectionId: connection.connectionId,
        integrationId: "youtube",
        endpoint:
          "/youtube/v3/search?part=snippet&forMine=true&type=video&maxResults=50",
        method: "GET",
        params: {},
      });
    }
  }, [selectedTemplate, connection]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setMetricName("");
    setParams({});
    setVideoOptions([]);
  };

  const handleSave = () => {
    if (!selectedTemplate || !metricName || !connection) return;

    createMetric.mutate({
      templateId: selectedTemplate.templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: selectedTemplate.description,
      endpointParams: params,
    });
  };

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
        <CardTitle>Create YouTube Metric</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label htmlFor="template">Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleTemplateChange}
          >
            <SelectTrigger id="template">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem
                  key={template.templateId}
                  value={template.templateId}
                >
                  {template.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <p className="text-muted-foreground text-sm">
              {selectedTemplate.description}
            </p>
          )}
        </div>

        {/* Metric Name */}
        {selectedTemplate && (
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name</Label>
            <Input
              id="name"
              placeholder="e.g., My Channel Stats"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}

        {/* Dynamic Parameters (VIDEO_ID) */}
        {selectedTemplate?.requiredParams.map((param) => {
          if (param.name === "VIDEO_ID") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Select
                  value={params[param.name] ?? ""}
                  onValueChange={(value) =>
                    setParams((prev) => ({ ...prev, [param.name]: value }))
                  }
                  disabled={videoOptions.length === 0}
                >
                  <SelectTrigger id={param.name}>
                    <SelectValue
                      placeholder={
                        fetchVideos.isPending
                          ? "Loading videos..."
                          : param.placeholder
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
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              </div>
            );
          }

          return null;
        })}

        {/* Save Button */}
        {selectedTemplate && (
          <Button
            onClick={handleSave}
            disabled={
              !metricName ||
              createMetric.isPending ||
              selectedTemplate.requiredParams.some(
                (p) => p.required && !params[p.name],
              )
            }
          >
            {createMetric.isPending ? "Creating..." : "Create Metric"}
          </Button>
        )}

        {createMetric.isError && (
          <p className="text-destructive text-sm">
            Error: {createMetric.error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
