"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

// =============================================================================
// Types
// =============================================================================

type Project = { label: string; value: string };
type Event = { label: string; value: string };

// =============================================================================
// Transform Functions
// =============================================================================

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

// =============================================================================
// PostHog Metrics Creation Page
// =============================================================================

export default function PostHogMetricsPage() {
  const [open, setOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [events, setEvents] = useState<Event[]>([]);

  const utils = api.useUtils();
  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "posthog",
  );

  const fetchProjects = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data) => {
      const projectList = transformProjects(data.data);
      setProjects(projectList);
    },
  });

  const fetchEvents = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data) => {
      const eventList = transformEvents(data.data);
      setEvents(eventList);
    },
  });

  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setOpen(false);
      setSelectedProject("");
      setSelectedEvent("");
      setProjects([]);
      setEvents([]);
    },
  });

  // Fetch projects when dialog opens
  useEffect(() => {
    if (open && connection && projects.length === 0) {
      fetchProjects.mutate({
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
        method: "GET",
        params: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connection]);

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
    if (!connection || !selectedProject || !selectedEvent) return;

    const selectedProjectName =
      projects.find((p) => p.value === selectedProject)?.label ?? "Project";
    const metricName = `${selectedProjectName} - ${selectedEvent}`;

    createMetric.mutate({
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
        <CardTitle>PostHog Event Metrics</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Event Metric</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event Metric</DialogTitle>
              <DialogDescription>
                Track event occurrences over time from your PostHog project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={selectedProject}
                  onValueChange={setSelectedProject}
                >
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
                      <SelectItem
                        key={`${event.value}-${index}`}
                        value={event.value}
                      >
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
                disabled={
                  !selectedProject || !selectedEvent || createMetric.isPending
                }
              >
                {createMetric.isPending ? "Creating..." : "Create Metric"}
              </Button>
            </DialogFooter>

            {createMetric.isError && (
              <p className="text-destructive text-sm">
                Error: {createMetric.error.message}
              </p>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
