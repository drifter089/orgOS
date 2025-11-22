/**
 * Metric Display Component
 * Fetches live metric data and displays the current value
 */

"use client";

import { Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { api } from "@/trpc/react";

// Import transforms for each integration
import { GITHUB_TRANSFORMS } from "../github/transforms";
import { GOOGLE_SHEETS_TRANSFORMS } from "../google-sheets/transforms";
import { POSTHOG_TRANSFORMS } from "../posthog/transforms";
import { getTemplate } from "../registry";
import { YOUTUBE_TRANSFORMS } from "../youtube/transforms";

/**
 * Metric Display Component
 * Fetches live metric data and displays the current value
 */

interface MetricDisplayProps {
  metricId: string;
}

export function MetricDisplay({ metricId }: MetricDisplayProps) {
  // Get saved metric config
  const { data: metric, isLoading: isLoadingMetric } =
    api.metric.getById.useQuery({ id: metricId });

  if (isLoadingMetric) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  if (!metric) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Metric not found</p>
        </CardContent>
      </Card>
    );
  }

  // Get template to construct fetch request
  const template = getTemplate(metric.metricTemplate ?? "");
  if (!template) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-muted-foreground text-sm">Template not found</p>
        </CardContent>
      </Card>
    );
  }

  return <MetricDataFetcher metric={metric} template={template} />;
}

interface MetricDataFetcherProps {
  metric: {
    id: string;
    name: string;
    description: string | null;
    integrationId: string | null;
    metricTemplate: string | null;
    endpointConfig: unknown;
  };
  template: {
    templateId: string;
    label: string;
    integrationId: string;
    metricEndpoint: string;
    method?: "GET" | "POST";
    requestBody?: unknown;
    metricType: string;
    defaultUnit?: string;
  };
}

function MetricDataFetcher({ metric, template }: MetricDataFetcherProps) {
  // Fetch live metric data
  const { data: metricData, isLoading } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: metric.integrationId ?? "", // saved connection
        integrationId: template.integrationId,
        endpoint: template.metricEndpoint,
        method: template.method ?? "GET",
        params: metric.endpointConfig as Record<string, string>,
        body: template.requestBody,
      },
      {
        enabled: !!metric.integrationId,
      },
    );

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{metric.name}</CardTitle>
          {metric.description && (
            <CardDescription>{metric.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading metric value...</span>
        </CardContent>
      </Card>
    );
  }

  // Transform data based on integration and template
  let displayValue: string | number = "N/A";

  if (metricData?.data) {
    // Apply transformations based on integration and template
    try {
      if (template.integrationId === "github") {
        if (template.templateId === "github-followers-count") {
          const transformed = GITHUB_TRANSFORMS.userProfile(metricData.data);
          displayValue = transformed.followers;
        } else if (template.templateId === "github-repos-count") {
          const transformed = GITHUB_TRANSFORMS.userProfile(metricData.data);
          displayValue = transformed.publicRepos;
        } else if (template.templateId === "github-repo-stars") {
          displayValue = GITHUB_TRANSFORMS.repoStars(metricData.data);
        } else if (template.templateId === "github-repo-forks") {
          displayValue = GITHUB_TRANSFORMS.repoForks(metricData.data);
        } else if (template.templateId === "github-repo-open-issues") {
          displayValue = GITHUB_TRANSFORMS.repoOpenIssues(metricData.data);
        } else if (template.templateId === "github-commit-activity") {
          const activity = GITHUB_TRANSFORMS.commitActivity(metricData.data);
          displayValue = activity.reduce((sum, week) => sum + week.total, 0);
        }
      } else if (template.integrationId === "posthog") {
        if (template.templateId === "posthog-event-count") {
          const eventData = POSTHOG_TRANSFORMS.eventCount(metricData.data);
          displayValue = eventData.reduce((sum, day) => sum + day.count, 0);
        } else if (template.templateId === "posthog-active-users") {
          displayValue = POSTHOG_TRANSFORMS.activeUsers(metricData.data);
        }
      } else if (template.integrationId === "google-sheet") {
        if (template.templateId === "gsheets-cell-value") {
          displayValue = GOOGLE_SHEETS_TRANSFORMS.cellValue(metricData.data);
        } else if (template.templateId === "gsheets-column-data") {
          const params = metric.endpointConfig as Record<string, string>;
          const columnIndex = parseInt(params.COLUMN_INDEX ?? "0", 10);
          const columnData = GOOGLE_SHEETS_TRANSFORMS.columnData(
            metricData.data,
            columnIndex,
          );
          displayValue = columnData.length;
        }
      } else if (template.integrationId === "youtube") {
        if (template.templateId === "youtube-channel-subscribers") {
          displayValue = YOUTUBE_TRANSFORMS.channelSubscribers(metricData.data);
        } else if (template.templateId === "youtube-channel-views") {
          displayValue = YOUTUBE_TRANSFORMS.channelViews(metricData.data);
        } else if (template.templateId === "youtube-channel-video-count") {
          displayValue = YOUTUBE_TRANSFORMS.channelVideoCount(metricData.data);
        } else if (template.templateId === "youtube-video-views") {
          displayValue = YOUTUBE_TRANSFORMS.videoViews(metricData.data);
        }
      }
    } catch (error) {
      console.error("Error transforming metric data:", error);
      displayValue = "Error";
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{metric.name}</CardTitle>
        {metric.description && (
          <CardDescription>{metric.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-2">
          <div className="text-4xl font-bold">
            {typeof displayValue === "number"
              ? displayValue.toLocaleString()
              : displayValue}
          </div>
          {template.defaultUnit && (
            <div className="text-muted-foreground text-sm">
              {template.defaultUnit}
            </div>
          )}
          <div className="text-muted-foreground text-xs">
            Template: {template.label}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
