/**
 * GitHub metric template definitions
 * Co-locates all GitHub-specific metric configurations
 */
import type { MetricTemplate } from "@/lib/metrics/types";

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
    requiredParams: [],
  },

  // ===== Repository Metrics (With dynamic dropdowns) =====
  {
    templateId: "github-repo-stars",
    label: "Repository Stars",
    description: "Star count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "stars",

    metricEndpoint: "/repos/{OWNER}/{REPO}",

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
        type: "dynamic-select",
        required: true,
        placeholder: "Select a repository",
        dynamicConfig: {
          endpoint: "/user/repos?per_page=100&sort=updated",
          method: "GET",
        },
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

    metricEndpoint: "/repos/{OWNER}/{REPO}",

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
        type: "dynamic-select",
        required: true,
        placeholder: "Select a repository",
        dynamicConfig: {
          endpoint: "/user/repos?per_page=100&sort=updated",
          method: "GET",
        },
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
        type: "dynamic-select",
        required: true,
        placeholder: "Select a repository",
        dynamicConfig: {
          endpoint: "/user/repos?per_page=100&sort=updated",
          method: "GET",
        },
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
        type: "dynamic-select",
        required: true,
        placeholder: "Select a repository",
        dynamicConfig: {
          endpoint: "/user/repos?per_page=100&sort=updated",
          method: "GET",
        },
      },
    ],
  },
];
