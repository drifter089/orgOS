"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, Loader2, Sparkles } from "lucide-react";

import type { ChartTransformResult } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { getTemplate } from "@/app/metric/registry";
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

import { useMetricDataPrefetch } from "../_hooks/use-metric-data-prefetch";
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

const TEMPLATE_ID = "posthog-event-count";

export function PostHogMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("");

  // AI transform state
  const [chartData, setChartData] = useState<ChartTransformResult | null>(null);
  const [isAiTransforming, setIsAiTransforming] = useState(false);
  const aiTriggeredForDataRef = useRef<string | null>(null);

  const template = getTemplate(TEMPLATE_ID);
  const transformAIMutation = api.dashboard.transformChartWithAI.useMutation();

  // Fetch projects for dropdown
  const { data: projectsData, isLoading: isLoadingProjects } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: "/api/projects/",
        method: "GET",
      },
      {
        enabled: !!connection,
        staleTime: 5 * 60 * 1000,
      },
    );

  // Fetch events for dropdown (depends on project)
  const { data: eventsData, isLoading: isLoadingEvents } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "posthog",
        endpoint: `/api/projects/${selectedProject}/event_definitions/`,
        method: "GET",
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

  // Build endpoint params
  const endpointParams = useMemo((): Record<string, string> => {
    if (!selectedProject || !selectedEvent) return {};
    return {
      PROJECT_ID: selectedProject,
      EVENT_NAME: selectedEvent,
    };
  }, [selectedProject, selectedEvent]);

  // Pre-fetch raw data when both project and event are selected
  const prefetch = useMetricDataPrefetch({
    connectionId: connection.connectionId,
    integrationId: "posthog",
    template: template ?? null,
    endpointParams,
    enabled: !!selectedProject && !!selectedEvent && !!template,
  });

  // Reset states when project changes
  const handleProjectChange = (value: string) => {
    setSelectedProject(value);
    setSelectedEvent("");
    setChartData(null);
    aiTriggeredForDataRef.current = null;
  };

  // Reset AI state when event changes
  const handleEventChange = (value: string) => {
    setSelectedEvent(value);
    setChartData(null);
    aiTriggeredForDataRef.current = null;
  };

  // Build metric name for AI transform
  const selectedProjectName =
    projects.find((p) => p.value === selectedProject)?.label ?? "Project";
  const metricName =
    selectedProject && selectedEvent
      ? `${selectedProjectName} - ${selectedEvent}`
      : "";

  // Auto-trigger AI transform when raw data becomes ready
  useEffect(() => {
    const dataKey = JSON.stringify({
      data: prefetch.data ? "exists" : null,
      project: selectedProject,
      event: selectedEvent,
    });

    if (
      prefetch.status === "ready" &&
      prefetch.data &&
      !chartData &&
      !isAiTransforming &&
      selectedProject &&
      selectedEvent &&
      aiTriggeredForDataRef.current !== dataKey
    ) {
      aiTriggeredForDataRef.current = dataKey;
      setIsAiTransforming(true);

      transformAIMutation.mutate(
        {
          metricConfig: {
            name: metricName,
            description: `Count occurrences of ${selectedEvent} event over time`,
            metricTemplate: TEMPLATE_ID,
            endpointConfig: endpointParams,
          },
          rawData: prefetch.data,
        },
        {
          onSuccess: (result) => {
            setChartData(result as ChartTransformResult);
            setIsAiTransforming(false);
          },
          onError: () => {
            setIsAiTransforming(false);
          },
        },
      );
    }
  }, [
    prefetch.status,
    prefetch.data,
    chartData,
    isAiTransforming,
    selectedProject,
    selectedEvent,
    metricName,
    endpointParams,
    transformAIMutation,
  ]);

  const handleCreate = () => {
    if (!selectedProject || !selectedEvent) return;

    // Reset the AI mutation to prevent duplicate calls if it's still running
    // The card will handle refreshing if chartData isn't ready
    transformAIMutation.reset();

    // Pass both raw data AND pre-computed chart data
    onSubmit(
      {
        templateId: TEMPLATE_ID,
        connectionId: connection.connectionId,
        name: metricName,
        description: `Count occurrences of ${selectedEvent} event over time`,
        endpointParams,
      },
      {
        rawData: prefetch.status === "ready" ? prefetch.data : undefined,
        chartData,
      },
    );
  };

  const isFormValid = !!selectedProject && !!selectedEvent;
  const isPrefetching = prefetch.status === "fetching";
  const isPrefetchReady = prefetch.status === "ready";
  const isChartReady = !!chartData;

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
            onValueChange={handleEventChange}
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

        {/* Status indicator */}
        {isFormValid && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {isPrefetching && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Fetching data...</span>
              </>
            )}
            {isPrefetchReady && !isChartReady && !isAiTransforming && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Data ready</span>
              </>
            )}
            {isAiTransforming && (
              <>
                <Sparkles className="h-3 w-3 animate-pulse text-blue-500" />
                <span className="text-blue-500">AI analyzing...</span>
              </>
            )}
            {isChartReady && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">
                  Chart ready - instant create!
                </span>
              </>
            )}
            {prefetch.status === "error" && (
              <span className="text-amber-600">Will fetch on create</span>
            )}
          </div>
        )}
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
