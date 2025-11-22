"use client";

import { useState } from "react";

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

function transformRepos(
  data: unknown,
): Array<{ label: string; value: string; owner: string; name: string }> {
  if (!Array.isArray(data)) return [];
  return data.map(
    (repo: {
      full_name: string;
      name: string;
      owner: { login: string };
      private: boolean;
    }) => ({
      label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
      value: repo.full_name, // Use full_name for uniqueness
      owner: repo.owner.login,
      name: repo.name,
    }),
  );
}

export default function GitHubMetricsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [metricName, setMetricName] = useState("");
  const [selectedRepo, setSelectedRepo] = useState<string>("");
  const [repoOptions, setRepoOptions] = useState<
    Array<{ label: string; value: string; owner: string; name: string }>
  >([]);

  const utils = api.useUtils();
  const createMetric = api.metric.create.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
      setIsOpen(false);
      setMetricName("");
      setSelectedRepo("");
      setRepoOptions([]);
    },
  });

  const fetchRepos = api.metric.fetchIntegrationData.useMutation({
    onSuccess: (data: { data: unknown }) => {
      const options = transformRepos(data.data);
      setRepoOptions(options);
    },
  });

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === "github",
  );

  const handleDialogOpen = (open: boolean) => {
    setIsOpen(open);
    if (open && connection && repoOptions.length === 0) {
      fetchRepos.mutate({
        connectionId: connection.connectionId,
        integrationId: "github",
        endpoint: "/user/repos?per_page=100&sort=updated",
        method: "GET",
        params: {},
      });
    }
  };

  const handleSave = () => {
    if (!metricName || !selectedRepo || !connection) return;

    const repo = repoOptions.find((r) => r.value === selectedRepo);
    if (!repo) return;

    const date28DaysAgo = new Date();
    date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);

    createMetric.mutate({
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

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No GitHub Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your GitHub account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>GitHub Commit History</CardTitle>
      </CardHeader>
      <CardContent>
        <Dialog open={isOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button>Add Metric</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Commit History Metric</DialogTitle>
              <DialogDescription>
                Track code additions and deletions for the last 28 days
              </DialogDescription>
            </DialogHeader>

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
                disabled={
                  !metricName || !selectedRepo || createMetric.isPending
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
