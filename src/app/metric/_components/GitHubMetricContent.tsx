"use client";

import { useMemo, useState } from "react";

import { Loader2 } from "lucide-react";

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

interface RepoOption {
  label: string;
  value: string;
  owner: string;
  name: string;
}

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

const TEMPLATE_ID = "github-code-frequency";

export function GitHubMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [metricName, setMetricName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");

  const template = getTemplate(TEMPLATE_ID);

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

  // Build endpoint params
  const endpointParams = useMemo((): Record<string, string> => {
    if (!selectedRepoDetails) return {};
    const date28DaysAgo = new Date();
    date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);
    return {
      OWNER: selectedRepoDetails.owner,
      REPO: selectedRepoDetails.name,
      DAYS: "28",
      SINCE: date28DaysAgo.toISOString().split("T")[0]!,
    };
  }, [selectedRepoDetails]);

  // Pre-fetch raw data when repo is selected
  const prefetch = useMetricDataPrefetch({
    connectionId: connection.connectionId,
    integrationId: "github",
    template: template ?? null,
    endpointParams,
    enabled: !!selectedRepo && !!template,
  });

  const handleSave = () => {
    if (!metricName || !selectedRepo || !selectedRepoDetails) return;

    void onSubmit(
      {
        templateId: TEMPLATE_ID,
        connectionId: connection.connectionId,
        name: metricName,
        description: "Last 28 days of code additions and deletions",
        endpointParams,
      },
      prefetch.status === "ready" ? prefetch.data : undefined,
    );
  };

  const isPrefetching = prefetch.status === "fetching";
  const isPrefetchReady = prefetch.status === "ready";

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="name">Metric Name</Label>
          <Input
            id="name"
            placeholder="e.g., React Repo Activity"
            value={metricName}
            onChange={(e) => setMetricName(e.target.value)}
          />
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
          <p className="text-muted-foreground text-sm">
            Select the repository to track commit activity
          </p>
        </div>

        {/* Prefetch status indicator */}
        {selectedRepo && (
          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            {isPrefetching && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Pre-loading data...</span>
              </>
            )}
            {isPrefetchReady && (
              <span className="text-green-600">Data ready</span>
            )}
            {prefetch.status === "error" && (
              <span className="text-amber-600">Will fetch on create</span>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button
          onClick={handleSave}
          disabled={!metricName || !selectedRepo || isCreating}
        >
          {isCreating ? "Creating..." : "Create Metric"}
        </Button>
      </DialogFooter>
    </>
  );
}
