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
import { templates } from "@/lib/integrations/posthog";
import { api } from "@/trpc/react";

// =============================================================================
// Transform Functions (moved from lib/integrations/posthog.ts)
// =============================================================================

function transformProjects(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: Array<{ name: string; id: number }>;
  };

  return (
    response.results?.map((p) => ({
      label: p.name,
      value: p.id.toString(),
    })) ?? []
  );
}

function transformEvents(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!data || typeof data !== "object") return [];

  const response = data as {
    results?: Array<{ name: string }>;
  };

  return (
    response.results?.map((e) => ({
      label: e.name,
      value: e.name,
    })) ?? []
  );
}

// =============================================================================
// PostHog Metrics Creation Page
// =============================================================================

export default function PostHogMetricsPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [metricName, setMetricName] = useState("");
  const [params, setParams] = useState<Record<string, string>>({});
  const [projectOptions, setProjectOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);
  const [eventOptions, setEventOptions] = useState<
    Array<{ label: string; value: string }>
  >([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setSelectedTemplateId("");
      setMetricName("");
      setParams({});
      setProjectOptions([]);
      setEventOptions([]);
    },
  });

  const fetchProjects = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformProjects(data.data);
      setProjectOptions(options);
    },
  });

  const fetchEvents = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformEvents(data.data);
      setEventOptions(options);
    },
  });

  const selectedTemplate = templates.find(
    (t) => t.templateId === selectedTemplateId,
  );

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "posthog",
  );

  // Fetch projects when template is selected
  useEffect(() => {
    if (selectedTemplate && connection && projectOptions.length === 0) {
      fetchProjects.mutate({
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
        method: "GET",
        params: {},
      });
    }
  }, [selectedTemplate, connection]);

  // Fetch events when project is selected
  useEffect(() => {
    if (
      params.PROJECT_ID &&
      connection &&
      selectedTemplate?.requiredParams.some((p) => p.name === "EVENT_NAME")
    ) {
      fetchEvents.mutate({
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: `/api/projects/${params.PROJECT_ID}/event_definitions/`,
        method: "GET",
        params: {},
      });
    }
  }, [params.PROJECT_ID, connection, selectedTemplate]);

  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setMetricName("");
    setParams({});
    setProjectOptions([]);
    setEventOptions([]);
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
          <CardTitle>No PostHog Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your PostHog account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create PostHog Metric</CardTitle>
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
              placeholder="e.g., My PostHog Events"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}

        {/* Dynamic Parameters */}
        {selectedTemplate?.requiredParams.map((param) => {
          if (param.name === "PROJECT_ID") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Select
                  value={params[param.name] ?? ""}
                  onValueChange={(value) =>
                    setParams((prev) => ({ ...prev, [param.name]: value }))
                  }
                  disabled={projectOptions.length === 0}
                >
                  <SelectTrigger id={param.name}>
                    <SelectValue
                      placeholder={
                        fetchProjects.isPending
                          ? "Loading projects..."
                          : param.placeholder
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {projectOptions.map((option) => (
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

          if (param.name === "EVENT_NAME") {
            return (
              <div key={param.name} className="space-y-2">
                <Label htmlFor={param.name}>{param.label}</Label>
                <Select
                  value={params[param.name] ?? ""}
                  onValueChange={(value) =>
                    setParams((prev) => ({ ...prev, [param.name]: value }))
                  }
                  disabled={!params.PROJECT_ID || eventOptions.length === 0}
                >
                  <SelectTrigger id={param.name}>
                    <SelectValue
                      placeholder={
                        !params.PROJECT_ID
                          ? "Select project first"
                          : fetchEvents.isPending
                            ? "Loading events..."
                            : param.placeholder
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {eventOptions.map((option) => (
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
