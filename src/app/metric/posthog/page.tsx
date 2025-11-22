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

// =============================================================================
// Types
// =============================================================================

type Project = { label: string; value: string };
type Event = { label: string; value: string };
type EventsByProject = Record<string, Event[]>;

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
  const [metricName, setMetricName] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");

  // Prefetched data
  const [projects, setProjects] = useState<Project[]>([]);
  const [eventsByProject, setEventsByProject] = useState<EventsByProject>({});
  const [isPrefetching, setIsPrefetching] = useState(false);

  const utils = api.useUtils();
  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "posthog",
  );

  const fetchProjects = api.metric.fetchIntegrationData.useMutation();
  const fetchEvents = api.metric.fetchIntegrationData.useMutation();

  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setOpen(false);
      setMetricName("");
      setSelectedProject("");
      setSelectedEvent("");
    },
  });

  // Prefetch projects and events when connection is available
  useEffect(() => {
    if (!connection || isPrefetching || projects.length > 0) return;

    setIsPrefetching(true);

    // Step 1: Fetch all projects
    fetchProjects.mutate(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
        method: "GET",
        params: {},
      },
      {
        onSuccess: (data) => {
          const projectList = transformProjects(data.data);
          setProjects(projectList);

          // Step 2: Fetch events for each project in the background
          let completedCount = 0;
          const totalProjects = projectList.length;

          if (totalProjects === 0) {
            setIsPrefetching(false);
            return;
          }

          projectList.forEach((project) => {
            fetchEvents.mutate(
              {
                connectionId: connection.connectionId,
                integrationId: "posthog",
                endpoint: `/api/projects/${project.value}/event_definitions/`,
                method: "GET",
                params: {},
              },
              {
                onSuccess: (eventData) => {
                  const events = transformEvents(eventData.data);
                  setEventsByProject((prev) => ({
                    ...prev,
                    [project.value]: events,
                  }));

                  completedCount++;
                  if (completedCount === totalProjects) {
                    setIsPrefetching(false);
                  }
                },
                onError: () => {
                  completedCount++;
                  if (completedCount === totalProjects) {
                    setIsPrefetching(false);
                  }
                },
              },
            );
          });
        },
        onError: () => {
          setIsPrefetching(false);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection, isPrefetching, projects.length]);

  const handleCreate = () => {
    if (!connection || !selectedProject || !selectedEvent || !metricName)
      return;

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

  const selectedProjectEvents = selectedProject
    ? (eventsByProject[selectedProject] ?? [])
    : [];

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
            <Button disabled={isPrefetching}>
              {isPrefetching ? "Loading..." : "Create Event Metric"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Event Metric</DialogTitle>
              <DialogDescription>
                Track event occurrences over time from your PostHog project
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Metric Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Metric Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Login Events"
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                />
              </div>

              {/* Project Selection */}
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={selectedProject}
                  onValueChange={(value) => {
                    setSelectedProject(value);
                    setSelectedEvent(""); // Reset event when project changes
                  }}
                >
                  <SelectTrigger id="project">
                    <SelectValue
                      placeholder={
                        projects.length === 0
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
                          : selectedProjectEvents.length === 0
                            ? "Loading events..."
                            : "Select an event"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProjectEvents.map((event) => (
                      <SelectItem key={event.value} value={event.value}>
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
                  !metricName ||
                  !selectedProject ||
                  !selectedEvent ||
                  createMetric.isPending
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
