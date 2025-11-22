/**
 * PostHog-specific metric configuration UI
 * Provides integration-specific forms and logic for creating PostHog metrics
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
import { POSTHOG_TRANSFORMS } from "./transforms";

/**
 * PostHog-specific metric configuration UI
 * Provides integration-specific forms and logic for creating PostHog metrics
 */

interface PostHogMetricConfigProps {
  connectionId: string;
  templateId: string;
  onSave: (config: {
    name: string;
    endpointParams: Record<string, string>;
  }) => void;
}

export function PostHogMetricConfig({
  connectionId,
  templateId,
  onSave,
}: PostHogMetricConfigProps) {
  const template = templates.find((t) => t.templateId === templateId);
  const [params, setParams] = useState<Record<string, string>>({});
  const [metricName, setMetricName] = useState(template?.label ?? "");

  if (!template) return <div>Template not found</div>;

  // Find project dropdown
  const projectParam = template.requiredParams.find(
    (p) => p.name === "PROJECT_ID",
  );

  // Find event dropdown (if exists and depends on project)
  const eventParam = template.requiredParams.find(
    (p) => p.name === "EVENT_NAME",
  );

  // Fetch projects for dropdown
  const { data: projectsData, isLoading: isLoadingProjects } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "posthog",
        endpoint: projectParam?.dynamicConfig?.endpoint ?? "",
        method: projectParam?.dynamicConfig?.method ?? "GET",
      },
      {
        enabled: !!projectParam?.dynamicConfig,
      },
    );

  const projectOptions = projectsData?.data
    ? POSTHOG_TRANSFORMS.projects(projectsData.data)
    : [];

  // Fetch events for dropdown (only if project is selected)
  const shouldFetchEvents = eventParam?.dynamicConfig && params.PROJECT_ID;

  const eventEndpoint =
    eventParam?.dynamicConfig?.endpoint?.replace(
      "{PROJECT_ID}",
      params.PROJECT_ID ?? "",
    ) ?? "";

  const { data: eventsData, isLoading: isLoadingEvents } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId,
        integrationId: "posthog",
        endpoint: eventEndpoint,
        method: eventParam?.dynamicConfig?.method ?? "GET",
      },
      {
        enabled: !!shouldFetchEvents,
      },
    );

  const eventOptions = eventsData?.data
    ? POSTHOG_TRANSFORMS.events(eventsData.data)
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

        if (param.type === "dynamic-select" && param.name === "PROJECT_ID") {
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) => {
                  setParams({ ...params, [param.name]: value, EVENT_NAME: "" });
                }}
                disabled={isLoadingProjects}
              >
                <SelectTrigger id={param.name}>
                  <SelectValue
                    placeholder={
                      isLoadingProjects
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
              {param.description && (
                <p className="text-muted-foreground text-sm">
                  {param.description}
                </p>
              )}
            </div>
          );
        }

        if (param.type === "dynamic-select" && param.name === "EVENT_NAME") {
          const isDisabled = !params.PROJECT_ID || isLoadingEvents;
          return (
            <div key={param.name} className="space-y-2">
              <Label htmlFor={param.name}>{param.label}</Label>
              <Select
                value={params[param.name]}
                onValueChange={(value) =>
                  setParams({ ...params, [param.name]: value })
                }
                disabled={isDisabled}
              >
                <SelectTrigger id={param.name}>
                  <SelectValue
                    placeholder={
                      !params.PROJECT_ID
                        ? "Select a project first"
                        : isLoadingEvents
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
