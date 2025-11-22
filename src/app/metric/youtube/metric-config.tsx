/**
 * YouTube-specific metric configuration UI
 * Provides integration-specific forms and logic for creating YouTube metrics
 */

"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
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

import { templates } from "./templates";
import { YOUTUBE_TRANSFORMS } from "./transforms";

/**
 * YouTube-specific metric configuration UI
 * Provides integration-specific forms and logic for creating YouTube metrics
 */

interface YouTubeMetricConfigProps {
  connectionId: string;
  templateId: string;
  onSave: (config: {
    name: string;
    endpointParams: Record<string, string>;
  }) => void;
}

export function YouTubeMetricConfig({
  connectionId,
  templateId,
  onSave,
}: YouTubeMetricConfigProps) {
  const template = templates.find((t) => t.templateId === templateId);
  const [params, setParams] = useState<Record<string, string>>({});
  const [metricName, setMetricName] = useState(template?.label ?? "");

  if (!template) return <div>Template not found</div>;

  // Find video dropdown (if exists)
  const videoParam = template.requiredParams.find((p) => p.name === "VIDEO_ID");

  // Fetch videos for dropdown
  const { data: videosData, isLoading: isLoadingVideos } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "youtube",
        endpoint: videoParam?.dynamicConfig?.endpoint ?? "",
        method: videoParam?.dynamicConfig?.method ?? "GET",
      },
      {
        enabled: !!videoParam?.dynamicConfig,
      },
    );

  const videoOptions = videosData?.data
    ? YOUTUBE_TRANSFORMS.videos(videosData.data)
    : [];

  const handleSave = () => {
    onSave({
      name: metricName,
      endpointParams: params,
    });
  };

  const isComplete = template.requiredParams.every(
    (param) => !param.required || params[param.name],
  );

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="metric-name">Metric Name</Label>
        <Input
          id="metric-name"
          value={metricName}
          onChange={(e) => setMetricName(e.target.value)}
          placeholder="Metric name"
        />
      </div>

      {template.requiredParams.map((param) => {
        if (param.type === "text") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                value={params[param.name] ?? ""}
                onChange={(e) =>
                  setParams({ ...params, [param.name]: e.target.value })
                }
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "number") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Input
                id={param.name}
                type="number"
                value={params[param.name] ?? ""}
                onChange={(e) =>
                  setParams({ ...params, [param.name]: e.target.value })
                }
                placeholder={param.placeholder}
              />
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "dynamic-select" && param.name === "VIDEO_ID") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
                disabled={isLoadingVideos}
              >
                <SelectTrigger id={param.name}>
                  <SelectValue
                    placeholder={
                      isLoadingVideos ? "Loading videos..." : param.placeholder
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
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "select" && param.options) {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
              >
                <SelectTrigger id={param.name}>
                  <SelectValue placeholder={param.placeholder ?? param.label} />
                </SelectTrigger>
                <SelectContent>
                  {param.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        return null;
      })}

      <Button onClick={handleSave} disabled={!isComplete} className="w-full">
        Save Metric
      </Button>
    </div>
  );
}
