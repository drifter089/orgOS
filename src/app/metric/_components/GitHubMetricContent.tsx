"use client";

import { useEffect, useState } from "react";

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

export function GitHubMetricContent({
  connection,
  onSubmit,
  isCreating,
}: ContentProps) {
  const [metricName, setMetricName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repoOptions, setRepoOptions] = useState<RepoOption[]>([]);

  const fetchRepos = api.metric.fetchIntegrationOptions.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformRepos(data.data);
      setRepoOptions(options);
    },
  });

  useEffect(() => {
    if (connection && repoOptions.length === 0) {
      fetchRepos.mutate({
        connectionId: connection.connectionId,
        integrationId: "github",
        endpoint: "/user/repos?per_page=100&sort=updated",
        method: "GET",
        params: {},
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  const handleSave = () => {
    if (!metricName || !selectedRepo) return;

    const repo = repoOptions.find((r) => r.value === selectedRepo);
    if (!repo) return;

    const date28DaysAgo = new Date();
    date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);

    onSubmit({
      templateId: "github-code-frequency",
      connectionId: connection.connectionId,
      name: metricName,
      description: "Last 28 days of code additions and deletions",
      endpointParams: {
        OWNER: repo.owner,
        REPO: repo.name,
        DAYS: "28",
        SINCE: date28DaysAgo.toISOString().split("T")[0]!,
      },
    });
  };

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
            disabled={repoOptions.length === 0}
          >
            <SelectTrigger id="repo">
              <SelectValue
                placeholder={
                  fetchRepos.isPending
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
