"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

import type { ContentProps } from "./MetricDialogBase";

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

export function PostHogMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");

  const { data: projectsData, isLoading: isLoadingProjects } =
    api.metric.fetchIntegrationOptions.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
      },
      {
        enabled: !!connection,
        staleTime: 5 * 60 * 1000,
      },
    );

  const { data: eventsData, isLoading: isLoadingEvents } =
    api.metric.fetchIntegrationOptions.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: `/api/projects/${selectedProject}/event_definitions/`,
      },
      {
        enabled: !!connection && !!selectedProject,
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

  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    setSelectedEvent("");
  };

  const handleCreate = () => {
    if (!selectedProject || !selectedEvent) return;

    const selectedProjectName =
      projects.find((p) => p.value === selectedProject)?.label ?? "Project";
    const metricName = `${selectedProjectName} - ${selectedEvent}`;

    onSubmit({
      templateId: "posthog-event-count",
      connectionId: connection.connectionId,
      name: metricName,
      description: `Count occurrences of ${selectedEvent} event over time`,
      endpointParams: {
        PROJECT_ID: selectedProject,
        EVENT_NAME: selectedEvent,
      },
    });
  };

  return (
    <>
      <div className="space-y-4">
        {/* Project Selection */}
        <div className="space-y-2">
          <Label htmlFor="project">Project</Label>
          <Select
            value={selectedProject}
            onValueChange={handleProjectChange}
            disabled={isLoadingProjects || projects.length === 0}
          >
            <SelectTrigger id="project">
              <SelectValue
                placeholder={
                  isLoadingProjects ? "Loading projects..." : "Select a project"
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
        </div>

        {/* Event Selection */}
        <div className="space-y-2">
          <Label htmlFor="event">Event</Label>
          <Select
            value={selectedEvent}
            onValueChange={setSelectedEvent}
            disabled={!selectedProject || isLoadingEvents}
          >
            <SelectTrigger id="event">
              <SelectValue
                placeholder={
                  !selectedProject
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
        <Button
          onClick={handleCreate}
          disabled={!selectedProject || !selectedEvent || isCreating}
        >
          {isCreating ? "Creating..." : "Create Metric"}
        </Button>
      </DialogFooter>
    </>
  );
}
