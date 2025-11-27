"use client";

import { useEffect, useMemo, useState } from "react";

import { Check, Loader2, Sparkles } from "lucide-react";

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

import { useApiToChartTransformer } from "../_hooks/use-api-to-chart-transformer";
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

  const selectedRepoDetails = useMemo(() => {
    return repoOptions.find((r) => r.value === selectedRepo);
  }, [repoOptions, selectedRepo]);

  const templateId = metricType ? getTemplateId(metricType) : null;
  const template = templateId ? getTemplate(templateId) : null;

  const endpointParams = useMemo((): Record<string, string> => {
    if (!selectedRepoDetails) return {};

    const params: Record<string, string> = {
      OWNER: selectedRepoDetails.owner,
      REPO: selectedRepoDetails.name,
    };

    if (metricType === "pull-requests") {
      params.SINCE = getDateDaysAgo(90);
    }

    return params;
  }, [selectedRepoDetails, metricType]);

  const isReadyForPrefetch = !!metricType && !!selectedRepo && !!metricName;

  // Use unified transform hook
  const transformer = useApiToChartTransformer({
    connectionId: connection.connectionId,
    integrationId: "github",
    template: template ?? null,
    endpointParams,
    metricName,
    metricDescription: metricType
      ? getMetricDescription(metricType)
      : undefined,
    enabled: isReadyForPrefetch,
  });

  // Reset transform on dropdown changes
  const handleMetricTypeChange = (value: MetricType) => {
    setMetricType(value);
    setMetricName("");
    transformer.reset();
  };

  const handleRepoChange = (value: string) => {
    setSelectedRepo(value);
    setMetricName("");
    transformer.reset();
  };

  // Auto-generate metric name
  useEffect(() => {
    if (metricType && selectedRepoDetails) {
      const metricLabel =
        METRIC_OPTIONS.find((m) => m.value === metricType)?.label ?? "";
      setMetricName(`${selectedRepoDetails.name} - ${metricLabel}`);
    }
  }, [metricType, selectedRepoDetails]);

  const handleSave = () => {
    if (!metricName || !selectedRepo || !selectedRepoDetails || !templateId)
      return;

    onSubmit({
      templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: getMetricDescription(metricType as MetricType),
      endpointParams,
    });
  };

  const isFormValid = !!metricType && !!selectedRepo && !!metricName;
  const isFetching = transformer.status === "fetching" || transformer.isLoading;
  const isTransforming =
    transformer.status === "transforming" || transformer.isTransforming;
  const isChartReady = !!transformer.chartData;
  const isDataReady =
    transformer.status === "ready" && transformer.rawData && !isChartReady;

  return (
    <>
      <div className="space-y-4 py-4">
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

        {isFormValid && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {isFetching && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Fetching data...</span>
              </>
            )}
            {isDataReady && !isTransforming && (
              <>
                <Check className="h-3 w-3 text-green-600" />
                <span className="text-green-600">Data ready</span>
              </>
            )}
            {isTransforming && (
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
            {transformer.status === "error" && (
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
