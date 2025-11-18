"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/trpc/react";

interface GitHubMetricCreatorProps {
  connectionId: string;
  onSuccess?: () => void;
}

// Template definitions with metadata
const userLevelTemplates = [
  {
    id: "github-followers-count",
    label: "Followers",
    description: "Track your total number of GitHub followers",
  },
  {
    id: "github-repos-count",
    label: "Repositories",
    description: "Track your total count of public repositories",
  },
  {
    id: "github-stars-total",
    label: "Total Stars",
    description: "Track total stars across all your repositories",
  },
] as const;

const repoInfoTemplates = [
  {
    id: "github-repo-stars",
    label: "Repo Stars",
    description: "Star count for a specific repository",
  },
  {
    id: "github-repo-forks",
    label: "Repo Forks",
    description: "Fork count for a specific repository",
  },
  {
    id: "github-repo-watchers",
    label: "Repo Watchers",
    description: "Watcher count for a specific repository",
  },
  {
    id: "github-repo-open-issues",
    label: "Open Issues",
    description: "Number of open issues in a repository",
  },
] as const;

const timeSeriesTemplates = [
  {
    id: "github-commit-activity",
    label: "Commit Activity",
    description:
      "Weekly commit activity for the last year - perfect for line charts",
  },
  {
    id: "github-code-frequency",
    label: "Code Frequency",
    description:
      "Weekly additions/deletions - excellent for area charts showing code growth",
  },
  {
    id: "github-participation",
    label: "Participation",
    description:
      "Owner vs all contributors over 52 weeks - perfect for comparative charts",
  },
] as const;

const distributionTemplates = [
  {
    id: "github-contributor-stats",
    label: "Contributors",
    description:
      "Commits per contributor - great for bar charts and leaderboards",
  },
  {
    id: "github-punch-card",
    label: "Punch Card",
    description:
      "Hourly commit distribution by day - perfect for heatmap visualizations",
  },
  {
    id: "github-languages",
    label: "Languages",
    description:
      "Language distribution in repository - perfect for pie/donut charts",
  },
] as const;

const listTemplates = [
  {
    id: "github-issues-list",
    label: "Issues List",
    description: "Repository issues with details - track issue trends",
    hasState: true,
  },
  {
    id: "github-pulls-list",
    label: "PRs List",
    description: "Pull requests with details - track PR velocity",
    hasState: true,
  },
  {
    id: "github-commits-list",
    label: "Commits List",
    description: "Recent commits with author and message details",
    hasState: false,
  },
  {
    id: "github-workflow-runs",
    label: "Workflow Runs",
    description: "GitHub Actions runs - track CI/CD success rates",
    hasState: false,
  },
] as const;

type TemplateCategory =
  | "user"
  | "repo-info"
  | "time-series"
  | "distribution"
  | "lists";

type UserTemplateId = (typeof userLevelTemplates)[number]["id"];
type RepoInfoTemplateId = (typeof repoInfoTemplates)[number]["id"];
type TimeSeriesTemplateId = (typeof timeSeriesTemplates)[number]["id"];
type DistributionTemplateId = (typeof distributionTemplates)[number]["id"];
type ListTemplateId = (typeof listTemplates)[number]["id"];

type RepoTemplateId =
  | RepoInfoTemplateId
  | TimeSeriesTemplateId
  | DistributionTemplateId
  | ListTemplateId;

export function GitHubMetricCreator({
  connectionId,
  onSuccess,
}: GitHubMetricCreatorProps) {
  const [category, setCategory] = useState<TemplateCategory>("user");
  const [userTemplateId, setUserTemplateId] = useState<UserTemplateId>(
    "github-followers-count",
  );
  const [repoTemplateId, setRepoTemplateId] =
    useState<RepoTemplateId>("github-repo-stars");

  // Repository selection (full_name format: "owner/repo")
  const [selectedRepo, setSelectedRepo] = useState("");
  const [state, setState] = useState<"open" | "closed" | "all">("open");

  // Metric configuration
  const [metricName, setMetricName] = useState("");
  const [targetValue, setTargetValue] = useState("");

  // Fetch repositories dynamically
  const { data: repos, isLoading: loadingRepos } =
    api.metric.fetchDynamicOptions.useQuery({
      connectionId,
      endpoint: "github-repos",
    });

  // Create metric mutation
  const createMutation = api.metric.createFromTemplate.useMutation({
    onSuccess: () => {
      setMetricName("");
      setTargetValue("");
      setSelectedRepo("");
      onSuccess?.();
    },
  });

  const handleCategoryChange = (newCategory: TemplateCategory) => {
    setCategory(newCategory);
    // Reset template selection for the new category
    if (newCategory === "user") {
      setUserTemplateId("github-followers-count");
    } else if (newCategory === "repo-info") {
      setRepoTemplateId("github-repo-stars");
    } else if (newCategory === "time-series") {
      setRepoTemplateId("github-commit-activity");
    } else if (newCategory === "distribution") {
      setRepoTemplateId("github-contributor-stats");
    } else if (newCategory === "lists") {
      setRepoTemplateId("github-issues-list");
    }
  };

  // Parse owner/repo from full_name
  const parseRepo = (fullName: string) => {
    const [owner, repo] = fullName.split("/");
    return { owner: owner ?? "", repo: repo ?? "" };
  };

  const handleCreate = () => {
    if (category === "user") {
      createMutation.mutate({
        templateId: userTemplateId,
        connectionId,
        name: metricName || undefined,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
      });
    } else {
      // Parse owner/repo from selected repository
      const { owner, repo } = parseRepo(selectedRepo);

      const endpointParams: Record<string, string> = {
        OWNER: owner,
        REPO: repo,
      };

      // Add STATE for issues/pulls templates
      if (
        repoTemplateId === "github-issues-list" ||
        repoTemplateId === "github-pulls-list"
      ) {
        endpointParams.STATE = state;
      }

      createMutation.mutate({
        templateId: repoTemplateId,
        connectionId,
        name: metricName || selectedRepo,
        targetValue: targetValue ? parseFloat(targetValue) : undefined,
        endpointParams,
      });
    }
  };

  const getCurrentTemplateInfo = () => {
    if (category === "user") {
      return userLevelTemplates.find((t) => t.id === userTemplateId);
    }
    const allRepoTemplates = [
      ...repoInfoTemplates,
      ...timeSeriesTemplates,
      ...distributionTemplates,
      ...listTemplates,
    ];
    return allRepoTemplates.find((t) => t.id === repoTemplateId);
  };

  const needsStateParam =
    repoTemplateId === "github-issues-list" ||
    repoTemplateId === "github-pulls-list";

  const canCreate = category === "user" ? true : Boolean(selectedRepo);

  const info = getCurrentTemplateInfo();

  return (
    <div className="space-y-6">
      {/* Category Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Metric Category</CardTitle>
          <CardDescription>
            Choose between user-level metrics or repository-specific metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={category}
            onValueChange={(v) => handleCategoryChange(v as TemplateCategory)}
          >
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="user">User</TabsTrigger>
              <TabsTrigger value="repo-info">Repo Info</TabsTrigger>
              <TabsTrigger value="time-series">Time Series</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
              <TabsTrigger value="lists">Lists</TabsTrigger>
            </TabsList>

            <TabsContent value="user" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Track metrics about your GitHub profile (no repository selection
                needed)
              </p>
              <Select
                value={userTemplateId}
                onValueChange={(v) => setUserTemplateId(v as UserTemplateId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {userLevelTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="repo-info" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Basic repository metrics like stars, forks, and watchers
              </p>
              <Select
                value={repoTemplateId}
                onValueChange={(v) =>
                  setRepoTemplateId(v as RepoInfoTemplateId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {repoInfoTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="time-series" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Historical data perfect for line charts and trend analysis
              </p>
              <Select
                value={repoTemplateId}
                onValueChange={(v) =>
                  setRepoTemplateId(v as TimeSeriesTemplateId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {timeSeriesTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="distribution" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                Distribution data ideal for pie charts, bar charts, and heatmaps
              </p>
              <Select
                value={repoTemplateId}
                onValueChange={(v) =>
                  setRepoTemplateId(v as DistributionTemplateId)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {distributionTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>

            <TabsContent value="lists" className="space-y-4 pt-4">
              <p className="text-muted-foreground text-sm">
                List data for issues, PRs, commits, and workflow runs
              </p>
              <Select
                value={repoTemplateId}
                onValueChange={(v) => setRepoTemplateId(v as ListTemplateId)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select metric" />
                </SelectTrigger>
                <SelectContent>
                  {listTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </TabsContent>
          </Tabs>

          {/* Show current template description */}
          {info && (
            <div className="bg-muted/50 mt-4 rounded-lg p-3">
              <p className="text-sm font-medium">{info.label}</p>
              <p className="text-muted-foreground text-xs">
                {info.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repository Selection (for repo-level metrics) */}
      {category !== "user" && (
        <Card>
          <CardHeader>
            <CardTitle>Select Repository</CardTitle>
            <CardDescription>
              Choose from your accessible repositories
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="repo">Repository *</Label>
              <Select
                value={selectedRepo}
                onValueChange={setSelectedRepo}
                disabled={loadingRepos}
              >
                <SelectTrigger id="repo">
                  <SelectValue
                    placeholder={
                      loadingRepos
                        ? "Loading repositories..."
                        : "Select a repository"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {repos?.map((repo) => (
                    <SelectItem key={repo.value} value={repo.value}>
                      {repo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State selection for issues/pulls */}
            {needsStateParam && (
              <div className="space-y-2">
                <Label htmlFor="state">State Filter</Label>
                <Select
                  value={state}
                  onValueChange={(v) =>
                    setState(v as "open" | "closed" | "all")
                  }
                >
                  <SelectTrigger id="state">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                    <SelectItem value="all">All</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Metric Configuration */}
      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Metric</CardTitle>
            <CardDescription>
              Customize your metric name and target value
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="metric-name">Metric Name (Optional)</Label>
              <Input
                id="metric-name"
                placeholder={
                  category === "user"
                    ? "Leave empty to use default name"
                    : `e.g., ${selectedRepo || "owner/repo"} ${info?.label ?? ""}`
                }
                value={metricName}
                onChange={(e) => setMetricName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">Target Value (Optional)</Label>
              <Input
                id="target"
                type="number"
                step="0.01"
                placeholder="e.g., 1000"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
              />
            </div>

            <Button
              onClick={handleCreate}
              disabled={!canCreate || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? "Creating..." : "Create Metric"}
            </Button>

            {createMutation.isError && (
              <p className="text-sm text-red-600">
                {createMutation.error.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
