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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

interface PostHogMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

export function PostHogMetricCreator({
  connectionId,
  onSuccess,
}: PostHogMetricCreatorProps) {
  const [metricType, setMetricType] = useState<"event-count" | "active-users">(
    "event-count",
  );
  const [projectId, setProjectId] = useState("");
  const [eventName, setEventName] = useState("");
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  // Fetch PostHog projects
  const { data: projects, isLoading: loadingProjects } =
    api.metricIntegration.fetchDynamicOptions.useQuery({
      connectionId,
      endpoint: "posthog-projects",
    });

  // Fetch events for selected project
  const { data: events, isLoading: loadingEvents } =
    api.metricIntegration.fetchDynamicOptions.useQuery(
      {
        connectionId,
        endpoint: "posthog-events",
        dependsOnValue: projectId,
      },
      {
        enabled: Boolean(projectId),
      },
    );

  // Create metric mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      // Reset form
      setProjectId("");
      setEventName("");
      setMetricName("");
      setTargetValue("");
      onSuccess?.();
    },
  });

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setEventName(""); // Clear event when project changes
  };

  const handleCreate = () => {
    if (metricType === "event-count") {
      if (!projectId || !eventName) return;

      createMutation.mutate({
        templateId: "posthog-event-count",
        connectionId,
        name: metricName || `${eventName} Count`,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        endpointParams: {
          PROJECT_ID: projectId,
          EVENT_NAME: eventName,
        },
      });
    } else {
      if (!projectId) return;

      createMutation.mutate({
        templateId: "posthog-active-users",
        connectionId,
        name: metricName || "Active Users",
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        endpointParams: {
          PROJECT_ID: projectId,
        },
      });
    }
  };

  const canCreate =
    metricType === "event-count"
      ? Boolean(projectId && eventName)
      : Boolean(projectId);

  return (
    <div className="space-y-6">
      {/* Metric Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Metric Type</CardTitle>
          <CardDescription>
            Choose the type of PostHog metric you want to track
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={metricType}
            onValueChange={(v) => setMetricType(v as typeof metricType)}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="event-count">Event Count</TabsTrigger>
              <TabsTrigger value="active-users">Active Users</TabsTrigger>
            </TabsList>

            <TabsContent value="event-count" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Track the count of specific events in your PostHog project
              </p>
            </TabsContent>

            <TabsContent value="active-users" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Track the number of active users in your PostHog project
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Project and Event Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Data Source</CardTitle>
          <CardDescription>
            Choose which project
            {metricType === "event-count" ? " and event" : ""} to track
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project *</Label>
            <Select
              value={projectId}
              onValueChange={handleProjectChange}
              disabled={loadingProjects}
            >
              <SelectTrigger id="project">
                <SelectValue
                  placeholder={
                    loadingProjects ? "Loading projects..." : "Select a project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Event Selection (only for event-count) */}
          {metricType === "event-count" && (
            <div className="space-y-2">
              <Label htmlFor="event">Event *</Label>
              <Select
                value={eventName}
                onValueChange={setEventName}
                disabled={!projectId || loadingEvents}
              >
                <SelectTrigger id="event">
                  <SelectValue
                    placeholder={
                      !projectId
                        ? "Select a project first"
                        : loadingEvents
                          ? "Loading events..."
                          : "Select an event"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {events?.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              Set a name and optional target value for your metric
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name</Label>
              <Input
                id="metric-name"
                placeholder={
                  metricType === "event-count"
                    ? `${eventName} Count`
                    : "Active Users"
                }
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                Leave empty to use default name
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Value (Optional)</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                placeholder="e.g., 1000"
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
