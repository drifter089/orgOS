"use client";

import { useEffect, useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

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

type MetricType = "code-frequency" | "commit-activity" | "pull-requests";

interface RepoOption {
  label: string;
  value: string;
  owner: string;
  name: string;
}

// Template IDs: github-code-frequency, github-commit-activity, github-pull-requests
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

    void onSubmit({
      templateId,
      connectionId: connection.connectionId,
      name: metricName,
      description: getMetricDescription(metricType as MetricType),
      endpointParams,
    });
  };

  const isFormValid = !!metricType && !!selectedRepo && !!metricName;

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="metric-type">Metric Type</Label>
          <Select
            value={metricType}
            onValueChange={(value) => setMetricType(value as MetricType)}
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
            onValueChange={setSelectedRepo}
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
      </div>

      <DialogFooter>
        <Button onClick={handleSave} disabled={!isFormValid || isCreating}>
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
