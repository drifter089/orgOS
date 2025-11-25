"use client";

import { useEffect, useState } from "react";

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

  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const fetchProjects = api.metric.fetchIntegrationOptions.useMutation({
    onSuccess: (data) => {
      const projectList = transformProjects(data.data);
      setProjects(projectList);
    },
  });

  const fetchEvents = api.metric.fetchIntegrationOptions.useMutation({
    onSuccess: (data) => {
      const eventList = transformEvents(data.data);
      setEvents(eventList);
    },
  });

  // Fetch projects when component mounts
  useEffect(() => {
    if (connection && projects.length === 0) {
      fetchProjects.mutate({
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
        method: "GET",
        params: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  // Fetch events when project is selected
  useEffect(() => {
    if (selectedProject && connection) {
      setEvents([]);
      setSelectedEvent("");
      fetchEvents.mutate({
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: `/api/projects/${selectedProject}/event_definitions/`,
        method: "GET",
        params: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, connection]);

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
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger id="project">
              <SelectValue
                placeholder={
                  fetchProjects.isPending
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
        </div>

        {/* Event Selection */}
        <div className="space-y-2">
          <Label htmlFor="event">Event</Label>
          <Select
            value={selectedEvent}
            onValueChange={setSelectedEvent}
            disabled={!selectedProject}
          >
            <SelectTrigger id="event">
              <SelectValue
                placeholder={
                  !selectedProject
                    ? "Select project first"
                    : fetchEvents.isPending
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
