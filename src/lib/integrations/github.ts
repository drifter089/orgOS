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

// =============================================================================
// Data Transformations
// =============================================================================

/**
 * Transform GitHub user profile data to extract specific metrics
 */
export function transformUserProfile(data: unknown): {
  followers: number;
  publicRepos: number;
} {
  if (!data || typeof data !== "object") {
    return { followers: 0, publicRepos: 0 };
  }

  const profile = data as {
    followers?: number;
    public_repos?: number;
  };

  return {
    followers: profile.followers ?? 0,
    publicRepos: profile.public_repos ?? 0,
  };
}

/**
 * Transform GitHub repos API response to dropdown options
 */
export function transformRepos(
  data: unknown,
): Array<{ label: string; value: string }> {
  if (!Array.isArray(data)) return [];

  return data.map(
    (repo: { full_name: string; name: string; private: boolean }) => ({
      label: `${repo.full_name}${repo.private ? " (private)" : ""}`,
      value: repo.name,
    }),
  );
}

/**
 * Transform repository data to extract star count
 */
export function transformRepoStars(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { stargazers_count?: number };
  return repo.stargazers_count ?? 0;
}

/**
 * Transform repository data to extract fork count
 */
export function transformRepoForks(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { forks_count?: number };
  return repo.forks_count ?? 0;
}

/**
 * Transform repository data to extract open issues count
 */
export function transformRepoOpenIssues(data: unknown): number {
  if (!data || typeof data !== "object") return 0;
  const repo = data as { open_issues_count?: number };
  return repo.open_issues_count ?? 0;
}

/**
 * Transform commit activity data (time series)
 */
export function transformCommitActivity(
  data: unknown,
): Array<{ week: number; total: number }> {
  if (!Array.isArray(data)) return [];

  return data.map((week: { week?: number; total?: number }) => ({
    week: week.week ?? 0,
    total: week.total ?? 0,
  }));
}

/**
 * Registry of all GitHub transformation functions
 */
export const transforms = {
  userProfile: transformUserProfile,
  repos: transformRepos,
  repoStars: transformRepoStars,
  repoForks: transformRepoForks,
  repoOpenIssues: transformRepoOpenIssues,
  commitActivity: transformCommitActivity,
};

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
