"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Check, Loader2, Sparkles } from "lucide-react";

import type { ChartTransformResult } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
import { getTemplate } from "@/app/metric/registry";
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

import { useMetricDataPrefetch } from "../_hooks/use-metric-data-prefetch";
import type { ContentProps } from "./MetricDialogBase";

type MetricType = "code-frequency" | "commit-activity" | "pull-requests";

interface RepoOption {
  label: string;
  value: string;
  owner: string;
  name: string;
}

const METRIC_OPTIONS: Array<{
  value: MetricType;
  label: string;
  description: string;
}> = [
  {
    value: "code-frequency",
    label: "Code Additions/Deletions",
    description: "Weekly code additions and deletions for the repository",
  },
  {
    value: "commit-activity",
    label: "Commit Activity",
    description: "Weekly commit counts for the last 52 weeks",
  },
  {
    value: "pull-requests",
    label: "Pull Requests",
    description: "Pull requests created in the last 90 days",
  },
];

function transformRepos(data: unknown): RepoOption[] {
  if (!Array.isArray(data)) return [];
  return data.map(
    (repo: {
      full_name: string;
      name: string;
      owner: { login: string };
      private: boolean;
    }) => ({
      label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
      value: repo.full_name,
      owner: repo.owner.login,
      name: repo.name,
    }),
  );
}

function getTemplateId(metricType: MetricType): string {
  return `github-${metricType}`;
}

function getMetricDescription(metricType: MetricType): string {
  return METRIC_OPTIONS.find((m) => m.value === metricType)?.description ?? "";
}

/**
 * Calculate date N days ago in YYYY-MM-DD format
 */
function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0]!;
}

export function GitHubMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [metricType, setMetricType] = useState<MetricType | "">("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [metricName, setMetricName] = useState("");

  // AI transform state
  const [chartData, setChartData] = useState<ChartTransformResult | null>(null);
  const [isAiTransforming, setIsAiTransforming] = useState(false);
  const aiTriggeredForDataRef = useRef<string | null>(null);

  const transformAIMutation = api.dashboard.transformChartWithAI.useMutation();

  // Fetch repos for dropdown
  const { data: reposData, isLoading: isLoadingRepos } =
    api.metric.fetchIntegrationData.useQuery(
      {
        connectionId: connection.connectionId,
        integrationId: "github",
        endpoint: "/user/repos?per_page=100&sort=updated",
        method: "GET",
      },
      {
        enabled: !!connection,
        staleTime: 5 * 60 * 1000,
      },
    );

  const repoOptions = useMemo(() => {
    if (!reposData?.data) return [];
    return transformRepos(reposData.data);
  }, [reposData]);

  // Get selected repo details
  const selectedRepoDetails = useMemo(() => {
    return repoOptions.find((r) => r.value === selectedRepo);
  }, [repoOptions, selectedRepo]);

  // Build template ID and get template
  const templateId = metricType ? getTemplateId(metricType) : null;
  const template = templateId ? getTemplate(templateId) : null;

  // Build endpoint params - use dynamic dates
  const endpointParams = useMemo((): Record<string, string> => {
    if (!selectedRepoDetails) return {};

    const params: Record<string, string> = {
      OWNER: selectedRepoDetails.owner,
      REPO: selectedRepoDetails.name,
    };

    // For pull requests, add SINCE date (90 days ago)
    if (metricType === "pull-requests") {
      params.SINCE = getDateDaysAgo(90);
    }

    return params;
  }, [selectedRepoDetails, metricType]);

  // Check if ready for prefetch
  const isReadyForPrefetch = !!metricType && !!selectedRepo;

  // Pre-fetch raw data when repo and metric type are selected
  const prefetch = useMetricDataPrefetch({
    connectionId: connection.connectionId,
    integrationId: "github",
    template: template ?? null,
    endpointParams,
    enabled: isReadyForPrefetch && !!template,
  });

  // Reset states when selections change
  const handleMetricTypeChange = (value: MetricType) => {
    setMetricType(value);
    setMetricName("");
    setChartData(null);
    aiTriggeredForDataRef.current = null;
  };

  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
    setMetricName("");
    setChartData(null);
    aiTriggeredForDataRef.current = null;
  };

  // Auto-generate metric name when both are selected
  useEffect(() => {
    if (metricType && selectedRepoDetails) {
      const metricLabel =
        METRIC_OPTIONS.find((m) => m.value === metricType)?.label ?? "";
      setMetricName(`${selectedRepoDetails.name} - ${metricLabel}`);
    }
  }, [metricType, selectedRepoDetails]);

  // Auto-trigger AI transform when raw data becomes ready
  useEffect(() => {
    // Create a unique key for this data fetch
    const dataKey = JSON.stringify({
      data: prefetch.data ? "exists" : null,
      template: templateId,
      params: endpointParams,
    });

    if (
      prefetch.status === "ready" &&
      prefetch.data &&
      !chartData &&
      !isAiTransforming &&
      metricName &&
      templateId &&
      aiTriggeredForDataRef.current !== dataKey
    ) {
      aiTriggeredForDataRef.current = dataKey;
      setIsAiTransforming(true);

      transformAIMutation.mutate(
        {
          metricConfig: {
            name: metricName,
            description: getMetricDescription(metricType as MetricType),
            metricTemplate: templateId,
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
    metricName,
    templateId,
    metricType,
    endpointParams,
    transformAIMutation,
  ]);

  const handleSave = () => {
    if (!metricName || !selectedRepo || !selectedRepoDetails || !templateId)
      return;

    // Reset the AI mutation to prevent duplicate calls if it's still running
    // The card will handle refreshing if chartData isn't ready
    transformAIMutation.reset();

    // Pass both raw data AND pre-computed chart data
    onSubmit(
      {
        templateId,
        connectionId: connection.connectionId,
        name: metricName,
        description: getMetricDescription(metricType as MetricType),
        endpointParams,
      },
      {
        rawData: prefetch.status === "ready" ? prefetch.data : undefined,
        chartData,
      },
    );
  };

  const isFormValid = !!metricType && !!selectedRepo && !!metricName;
  const isPrefetching = prefetch.status === "fetching";
  const isPrefetchReady = prefetch.status === "ready";
  const isChartReady = !!chartData;

  return (
    <>
      <div className="space-y-4 py-4">
        {/* Metric Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="metric-type">Metric Type</Label>
          <Select
            value={metricType}
            onValueChange={(value) =>
              handleMetricTypeChange(value as MetricType)
            }
          >
            <SelectTrigger id="metric-type">
              <SelectValue placeholder="Select metric type" />
            </SelectTrigger>
            <SelectContent>
              {METRIC_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {metricType && (
            <p className="text-muted-foreground text-sm">
              {getMetricDescription(metricType)}
            </p>
          )}
        </div>

        {/* Repository Selection */}
        <div className="space-y-2">
          <Label htmlFor="repo">Repository</Label>
          <Select
            value={selectedRepo}
            onValueChange={handleRepoChange}
            disabled={isLoadingRepos || repoOptions.length === 0}
          >
            <SelectTrigger id="repo">
              <SelectValue
                placeholder={
                  isLoadingRepos
                    ? "Loading repositories..."
                    : "Select a repository"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {repoOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metric Name */}
        {metricType && selectedRepo && (
          <div className="space-y-2">
            <Label htmlFor="name">Metric Name</Label>
            <Input
              id="name"
              placeholder="e.g., React Repo Activity"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
            />
          </div>
        )}

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
        <Button onClick={handleSave} disabled={!isFormValid || isCreating}>
          {isCreating ? "Creating..." : "Create Metric"}
        </Button>
      </DialogFooter>
    </>
  );
}
