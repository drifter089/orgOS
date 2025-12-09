"use client";

import { useMemo, useState } from "react";

import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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

import type { ContentProps } from "../base/MetricDialogBase";

type Project = { label: string; value: string };
type Event = { label: string; value: string };

function transformProjects(data: unknown): Project[] {
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

function transformEvents(data: unknown): Event[] {
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

const TEMPLATE_ID = "posthog-event-count";

export function PostHogMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");
  const [manualProjectId, setManualProjectId] = useState("");

  // Fetch projects for dropdown
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    error: projectsError,
  } = api.metric.fetchIntegrationData.useQuery(
    {
      connectionId: connection.connectionId,
      integrationId: "posthog",
      endpoint: "/api/projects/",
      method: "GET",
    },
    {
      enabled: !!connection,
      staleTime: 5 * 60 * 1000,
      retry: false, // Don't retry on 403 - it's a permission issue
    },
  );

  // Check if API key is project-scoped (403 error on /api/projects/)
  const isScopedApiKey = !!projectsError;

  // Effective project ID: from dropdown or manual input
  const effectiveProjectId = isScopedApiKey ? manualProjectId : selectedProject;

  // Fetch events for dropdown (depends on project)
  const { data: eventsData, isLoading: isLoadingEvents } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: `/api/projects/${effectiveProjectId}/event_definitions/`,
        method: "GET",
      },
      {
        enabled: !!connection && !!effectiveProjectId,
        staleTime: 5 * 60 * 1000,
      },
    );

  const projects = useMemo(() => {
    if (!projectsData?.data) return [];
    return transformProjects(projectsData.data);
  }, [projectsData]);

  const events = useMemo(() => {
    if (!eventsData?.data) return [];
    return transformEvents(eventsData.data);
  }, [eventsData]);

  const endpointParams = useMemo((): Record<string, string> => {
    if (!effectiveProjectId || !selectedEvent) return {};
    return {
      PROJECT_ID: effectiveProjectId,
      EVENT_NAME: selectedEvent,
    };
  }, [effectiveProjectId, selectedEvent]);

  const selectedProjectName = isScopedApiKey
    ? `Project ${manualProjectId}`
    : (projects.find((p) => p.value === selectedProject)?.label ?? "Project");
  const metricName =
    effectiveProjectId && selectedEvent
      ? `${selectedProjectName} - ${selectedEvent}`
      : "";

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    setSelectedEvent("");
  };

  const handleManualProjectIdChange = (value: string) => {
    setManualProjectId(value);
    setSelectedEvent("");
  };

  const handleCreate = () => {
    if (!effectiveProjectId || !selectedEvent) return;

    void onSubmit({
      templateId: TEMPLATE_ID,
      connectionId: connection.connectionId,
      name: metricName,
      description: `Count occurrences of ${selectedEvent} event over time`,
      endpointParams,
    });
  };

  const isFormValid = !!effectiveProjectId && !!selectedEvent;

  return (
    <>
      <div className="space-y-4">
        {isScopedApiKey && (
          <Alert>
            <AlertCircle className="size-4" />
            <AlertDescription>
              Your API key is project-scoped. Enter your Project ID manually.
              Find it in your PostHog URL: app.posthog.com/project/
              <strong>12345</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          {isScopedApiKey ? (
            <Input
              id="project"
              type="text"
              placeholder="Enter project ID (e.g., 12345)"
              value={manualProjectId}
              onChange={(e) => handleManualProjectIdChange(e.target.value)}
            />
          ) : (
            <Select
              value={selectedProject}
              onValueChange={handleProjectChange}
              disabled={isLoadingProjects || projects.length === 0}
            >
              <SelectTrigger id="project">
                <SelectValue
                  placeholder={
                    isLoadingProjects
                      ? "Loading projects..."
                      : "Select a project"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="event">Event</Label>
          <Select
            value={selectedEvent}
            onValueChange={setSelectedEvent}
            disabled={!effectiveProjectId || isLoadingEvents}
          >
            <SelectTrigger id="event">
              <SelectValue
                placeholder={
                  !effectiveProjectId
                    ? "Select project first"
                    : isLoadingEvents
                      ? "Loading events..."
                      : "Select an event"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {events.map((event, index) => (
                <SelectItem key={`${event.value}-${index}`} value={event.value}>
                  {event.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
