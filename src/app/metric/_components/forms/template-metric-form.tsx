"use client";

import { useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

// Import integration-specific config components
import { GitHubMetricConfig } from "@/app/metric/github/metric-config";
import { GoogleSheetsMetricConfig } from "@/app/metric/google-sheets/metric-config";
import { PostHogMetricConfig } from "@/app/metric/posthog/metric-config";
import { getTemplatesByIntegration } from "@/app/metric/registry";
import { YouTubeMetricConfig } from "@/app/metric/youtube/metric-config";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/react";

interface TemplateMetricFormProps {
  connectionId: string;
  integrationId: string;
  onSuccess?: () => void;
}

export function TemplateMetricForm({
  connectionId,
  integrationId,
  onSuccess,
}: TemplateMetricFormProps) {
  // Get templates from frontend registry (no API call needed)
  const templates = useMemo(
    () => getTemplatesByIntegration(integrationId),
    [integrationId],
  );

  // Template selection
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const selectedTemplate = templates?.find(
    (t) => t.templateId === selectedTemplateId,
  );

  // Create mutation (renamed from createFromTemplate to create)
  const createMutation = api.metric.create.useMutation({
    onSuccess: () => {
      // Reset form
      setSelectedTemplateId("");
      onSuccess?.();
    },
  });

  // Handle save from integration-specific config component
  const handleSave = (config: {
    name: string;
    endpointParams: Record<string, string>;
  }) => {
    if (!selectedTemplate) return;

    createMutation.mutate({
      templateId: selectedTemplate.templateId,
      connectionId,
      name: config.name,
      endpointParams: config.endpointParams,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Metric</CardTitle>
        <CardDescription>
          Select a template and configure your metric
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Template Selection */}
        <div className="space-y-2">
          <Label>Metric Template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={setSelectedTemplateId}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {templates?.map((template) => (
                <SelectItem
                  key={template.templateId}
                  value={template.templateId}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{template.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {template.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Integration-Specific Configuration */}
        {selectedTemplate && (
          <>
            <Separator />

            {/* Render integration-specific config component */}
            {integrationId === "github" && (
              <GitHubMetricConfig
                connectionId={connectionId}
                templateId={selectedTemplateId}
                onSave={handleSave}
              />
            )}

            {integrationId === "posthog" && (
              <PostHogMetricConfig
                connectionId={connectionId}
                templateId={selectedTemplateId}
                onSave={handleSave}
              />
            )}

            {integrationId === "google-sheet" && (
              <GoogleSheetsMetricConfig
                connectionId={connectionId}
                templateId={selectedTemplateId}
                onSave={handleSave}
              />
            )}

            {integrationId === "youtube" && (
              <YouTubeMetricConfig
                connectionId={connectionId}
                templateId={selectedTemplateId}
                onSave={handleSave}
              />
            )}

            {/* Show loading state during creation */}
            {createMutation.isPending && (
              <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Creating metric...</span>
              </div>
            )}

            {/* Show error if creation fails */}
            {createMutation.isError && (
              <div className="bg-destructive/10 text-destructive rounded-md p-4">
                <p className="text-sm font-medium">Failed to create metric</p>
                <p className="text-sm">{createMutation.error.message}</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
