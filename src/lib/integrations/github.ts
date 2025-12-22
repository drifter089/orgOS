/**
 * GitHub Integration Registry
 * Single source of truth for all GitHub-related configurations:
 * - Metric templates
 * - Data transformations
 * - API endpoints (for testing)
 */
import type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

// =============================================================================
// Metadata
// =============================================================================

export const name = "GitHub";
export const integrationId = "github";
export const baseUrl = "https://api.github.com";

// =============================================================================
// Metric Templates
// =============================================================================

export const templates: MetricTemplate[] = [
  // ===== Time Series Metrics (Used by UI dialogs) =====
  {
    templateId: "github-code-frequency",
    label: "Code Additions/Deletions",
    description: "Weekly code additions and deletions for the repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "lines",

    metricEndpoint: "/repos/{OWNER}/{REPO}/stats/code_frequency",

    // Architecture config
    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

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
    templateId: "github-commit-activity",
    label: "Commit Activity",
    description: "Weekly commit counts for the last 52 weeks",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "commits",

    metricEndpoint: "/repos/{OWNER}/{REPO}/stats/commit_activity",

    // Architecture config
    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

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
    templateId: "github-pull-requests",
    label: "Pull Requests",
    description: "Pull requests created in the last 90 days",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "pull requests",

    // Search API: /search/issues?q=repo:{OWNER}/{REPO}+is:pr+created:>={SINCE}
    metricEndpoint:
      "/search/issues?q=repo:{OWNER}/{REPO}+is:pr+created:>={SINCE}&per_page=100",

    // Architecture config
    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

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
      {
        name: "SINCE",
        label: "Since Date",
        description: "Start date for PR search (calculated automatically)",
        type: "text",
        required: true,
        placeholder: "2024-01-01",
      },
    ],
  },
];

// =============================================================================
// API Endpoints (for testing/debugging)
// =============================================================================

export const endpoints: Endpoint[] = [
  // ===== User Profile =====
  {
    label: "User Profile",
    path: "/user",
    method: "GET",
    description: "Get authenticated user's profile information",
  },
  {
    label: "User Repositories",
    path: "/user/repos",
    method: "GET",
    description: "List repositories for the authenticated user",
  },
  {
    label: "User Organizations",
    path: "/user/orgs",
    method: "GET",
    description: "List organizations for the authenticated user",
  },
  {
    label: "User Followers",
    path: "/user/followers",
    method: "GET",
    description: "List followers of the authenticated user",
  },

  // ===== Repository Info =====
  {
    label: "Get Repository",
    path: "/repos/{OWNER}/{REPO}",
    method: "GET",
    description: "Get repository information",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Repository Issues",
    path: "/repos/{OWNER}/{REPO}/issues",
    method: "GET",
    description: "List issues for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Pull Requests",
    path: "/repos/{OWNER}/{REPO}/pulls",
    method: "GET",
    description: "List pull requests for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Repository Commits",
    path: "/repos/{OWNER}/{REPO}/commits",
    method: "GET",
    description: "List commits in a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Repository Languages",
    path: "/repos/{OWNER}/{REPO}/languages",
    method: "GET",
    description: "List programming languages used in repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Commit Activity Stats",
    path: "/repos/{OWNER}/{REPO}/stats/commit_activity",
    method: "GET",
    description: "Weekly commit activity for the last year",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Code Frequency Stats",
    path: "/repos/{OWNER}/{REPO}/stats/code_frequency",
    method: "GET",
    description: "Weekly additions/deletions",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Contributor Statistics",
    path: "/repos/{OWNER}/{REPO}/stats/contributors",
    method: "GET",
    description: "Commit statistics per contributor",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Workflow Runs",
    path: "/repos/{OWNER}/{REPO}/actions/runs",
    method: "GET",
    description: "List GitHub Actions workflow runs",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
];

export const exampleParams = {
  OWNER: "facebook",
  REPO: "react",
};

// =============================================================================
// Service Config (for api-test)
// =============================================================================

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
