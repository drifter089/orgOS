import type { MetricTemplate } from "../base";

export const templates: MetricTemplate[] = [
  // ===== User-Level Metrics (No params) =====
  {
    templateId: "github-followers-count",
    label: "Followers",
    description: "Total number of GitHub followers",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "followers",
    metricEndpoint: "/user",
    dataPath: "followers",
    requiredParams: [],
  },
  {
    templateId: "github-repos-count",
    label: "Public Repositories",
    description: "Total count of public repositories",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "repos",
    metricEndpoint: "/user",
    dataPath: "public_repos",
    requiredParams: [],
  },

  // ===== Repository Metrics (With dropdown) =====
  {
    templateId: "github-repo-stars",
    label: "Repository Stars",
    description: "Star count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "stars",

    dropdowns: [
      {
        paramName: "FULL_REPO",
        endpoint: "/user/repos?per_page=100&sort=updated",
        transform: (data: unknown) =>
          (data as Array<{ full_name: string; private: boolean }>).map(
            (repo) => ({
              label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
              value: repo.full_name,
            }),
          ),
      },
    ],

    metricEndpoint: "/repos/{OWNER}/{REPO}",
    dataPath: "stargazers_count",

    requiredParams: [
      {
        name: "OWNER",
        label: "Repository Owner",
        description: "GitHub username or organization",
        type: "text",
        required: true,
        placeholder: "facebook",
      },
      {
        name: "REPO",
        label: "Repository Name",
        description: "Repository name",
        type: "text",
        required: true,
        placeholder: "react",
      },
    ],
  },
  {
    templateId: "github-repo-forks",
    label: "Repository Forks",
    description: "Fork count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "forks",

    dropdowns: [
      {
        paramName: "FULL_REPO",
        endpoint: "/user/repos?per_page=100&sort=updated",
        transform: (data: unknown) =>
          (data as Array<{ full_name: string; private: boolean }>).map(
            (repo) => ({
              label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
              value: repo.full_name,
            }),
          ),
      },
    ],

    metricEndpoint: "/repos/{OWNER}/{REPO}",
    dataPath: "forks_count",

    requiredParams: [
      {
        name: "OWNER",
        label: "Repository Owner",
        description: "GitHub username or organization",
        type: "text",
        required: true,
        placeholder: "facebook",
      },
      {
        name: "REPO",
        label: "Repository Name",
        description: "Repository name",
        type: "text",
        required: true,
        placeholder: "react",
      },
    ],
  },
  {
    templateId: "github-repo-open-issues",
    label: "Open Issues Count",
    description: "Number of open issues in a repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "issues",

    metricEndpoint: "/repos/{OWNER}/{REPO}",
    dataPath: "open_issues_count",

    requiredParams: [
      {
        name: "OWNER",
        label: "Repository Owner",
        description: "GitHub username or organization",
        type: "text",
        required: true,
        placeholder: "facebook",
      },
      {
        name: "REPO",
        label: "Repository Name",
        description: "Repository name",
        type: "text",
        required: true,
        placeholder: "react",
      },
    ],
  },

  // ===== Time Series Metrics =====
  {
    templateId: "github-commit-activity",
    label: "Commit Activity (Last Year)",
    description:
      "Weekly commit activity - returns array for time-series charts",
    integrationId: "github",
    metricType: "number",

    metricEndpoint: "/repos/{OWNER}/{REPO}/stats/commit_activity",
    dataPath: ".",
    transform: "extractCommitActivity",

    requiredParams: [
      {
        name: "OWNER",
        label: "Repository Owner",
        description: "GitHub username or organization",
        type: "text",
        required: true,
      },
      {
        name: "REPO",
        label: "Repository Name",
        description: "Repository name",
        type: "text",
        required: true,
      },
    ],
  },
];
