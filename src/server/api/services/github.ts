/**
 * Fetch data from GitHub API using Nango proxy
 */
import { Nango } from "@nangohq/node";
import { TRPCError } from "@trpc/server";

import { env } from "@/env";

/**
 * GitHub API Endpoint Definitions
 * Base URL handled by Nango proxy
 */

export interface ServiceEndpoint {
  label: string;
  path: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  description?: string;
  requiresParams?: boolean;
  params?: string[];
}

/**
 * Generic endpoint patterns for metric templates
 * Used by metric system to create dynamic metrics
 */
export const githubMetricEndpoints = {
  USER_PROFILE: "/user",
  USER_REPOS: "/user/repos",
  USER_FOLLOWERS: "/user/followers",
} as const;

/**
 * Test endpoints for API testing page
 * These are example endpoints users can test manually
 */
export const githubEndpoints: ServiceEndpoint[] = [
  // ===== User Profile & Account =====
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
    label: "Starred Repositories",
    path: "/user/starred",
    method: "GET",
    description: "List repositories starred by the authenticated user",
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
  {
    label: "User Following",
    path: "/user/following",
    method: "GET",
    description: "List users followed by the authenticated user",
  },

  // ===== Issues =====
  {
    label: "List User Issues",
    path: "/issues",
    method: "GET",
    description:
      "List all issues assigned to the authenticated user across all repos",
  },
  {
    label: "List Repository Issues",
    path: "/repos/{OWNER}/{REPO}/issues",
    method: "GET",
    description: "List issues for a specific repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Issue Details",
    path: "/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}",
    method: "GET",
    description: "Get details of a specific issue",
    requiresParams: true,
    params: ["OWNER", "REPO", "ISSUE_NUMBER"],
  },
  {
    label: "List Issue Comments",
    path: "/repos/{OWNER}/{REPO}/issues/{ISSUE_NUMBER}/comments",
    method: "GET",
    description: "List comments on a specific issue",
    requiresParams: true,
    params: ["OWNER", "REPO", "ISSUE_NUMBER"],
  },

  // ===== Pull Requests =====
  {
    label: "List Pull Requests",
    path: "/repos/{OWNER}/{REPO}/pulls",
    method: "GET",
    description: "List pull requests for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Pull Request Details",
    path: "/repos/{OWNER}/{REPO}/pulls/{PULL_NUMBER}",
    method: "GET",
    description: "Get details of a specific pull request",
    requiresParams: true,
    params: ["OWNER", "REPO", "PULL_NUMBER"],
  },
  {
    label: "List PR Commits",
    path: "/repos/{OWNER}/{REPO}/pulls/{PULL_NUMBER}/commits",
    method: "GET",
    description: "List commits in a pull request",
    requiresParams: true,
    params: ["OWNER", "REPO", "PULL_NUMBER"],
  },
  {
    label: "List PR Reviews",
    path: "/repos/{OWNER}/{REPO}/pulls/{PULL_NUMBER}/reviews",
    method: "GET",
    description: "List reviews on a pull request",
    requiresParams: true,
    params: ["OWNER", "REPO", "PULL_NUMBER"],
  },

  // ===== Commits =====
  {
    label: "List Repository Commits",
    path: "/repos/{OWNER}/{REPO}/commits",
    method: "GET",
    description: "List commits in a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Commit Details",
    path: "/repos/{OWNER}/{REPO}/commits/{COMMIT_SHA}",
    method: "GET",
    description: "Get details of a specific commit",
    requiresParams: true,
    params: ["OWNER", "REPO", "COMMIT_SHA"],
  },

  // ===== Releases =====
  {
    label: "List Releases",
    path: "/repos/{OWNER}/{REPO}/releases",
    method: "GET",
    description: "List releases for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Latest Release",
    path: "/repos/{OWNER}/{REPO}/releases/latest",
    method: "GET",
    description: "Get the latest published release",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Release by Tag",
    path: "/repos/{OWNER}/{REPO}/releases/tags/{TAG}",
    method: "GET",
    description: "Get a release by tag name",
    requiresParams: true,
    params: ["OWNER", "REPO", "TAG"],
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
    label: "List Repository Languages",
    path: "/repos/{OWNER}/{REPO}/languages",
    method: "GET",
    description: "List programming languages used in a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Repository Contributors",
    path: "/repos/{OWNER}/{REPO}/contributors",
    method: "GET",
    description: "List contributors to a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Repository Statistics",
    path: "/repos/{OWNER}/{REPO}/stats/participation",
    method: "GET",
    description: "Get weekly commit activity statistics",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },

  // ===== Branches & Tags =====
  {
    label: "List Branches",
    path: "/repos/{OWNER}/{REPO}/branches",
    method: "GET",
    description: "List branches in a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Branch",
    path: "/repos/{OWNER}/{REPO}/branches/{BRANCH}",
    method: "GET",
    description: "Get a specific branch",
    requiresParams: true,
    params: ["OWNER", "REPO", "BRANCH"],
  },
  {
    label: "List Tags",
    path: "/repos/{OWNER}/{REPO}/tags",
    method: "GET",
    description: "List tags in a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },

  // ===== GitHub Actions =====
  {
    label: "List Workflows",
    path: "/repos/{OWNER}/{REPO}/actions/workflows",
    method: "GET",
    description: "List GitHub Actions workflows",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Workflow Runs",
    path: "/repos/{OWNER}/{REPO}/actions/runs",
    method: "GET",
    description: "List workflow runs for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Workflow Run",
    path: "/repos/{OWNER}/{REPO}/actions/runs/{RUN_ID}",
    method: "GET",
    description: "Get details of a specific workflow run",
    requiresParams: true,
    params: ["OWNER", "REPO", "RUN_ID"],
  },

  // ===== Notifications & Activity =====
  {
    label: "List Notifications",
    path: "/notifications",
    method: "GET",
    description: "List notifications for the authenticated user",
  },
  {
    label: "List Repository Events",
    path: "/repos/{OWNER}/{REPO}/events",
    method: "GET",
    description: "List public events for a repository",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List User Events",
    path: "/users/{USERNAME}/events",
    method: "GET",
    description: "List public events performed by a user",
    requiresParams: true,
    params: ["USERNAME"],
  },

  // ===== Repository Statistics (EXCELLENT FOR CHARTS) =====
  {
    label: "Commit Activity (Last Year)",
    path: "/repos/{OWNER}/{REPO}/stats/commit_activity",
    method: "GET",
    description:
      "Weekly commit activity for the last year - PERFECT for time-series charts",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Contributor Statistics",
    path: "/repos/{OWNER}/{REPO}/stats/contributors",
    method: "GET",
    description:
      "Total commits per contributor - GREAT for contributor comparison charts",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Code Frequency",
    path: "/repos/{OWNER}/{REPO}/stats/code_frequency",
    method: "GET",
    description:
      "Weekly additions/deletions - EXCELLENT for code growth charts",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Participation Stats",
    path: "/repos/{OWNER}/{REPO}/stats/participation",
    method: "GET",
    description: "Owner vs all commit participation in last 52 weeks",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Punch Card",
    path: "/repos/{OWNER}/{REPO}/stats/punch_card",
    method: "GET",
    description:
      "Hourly commit distribution - PERFECT for heatmap visualization",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },

  // ===== Repository Engagement =====
  {
    label: "List Stargazers",
    path: "/repos/{OWNER}/{REPO}/stargazers",
    method: "GET",
    description:
      "List users who starred the repo - track star growth over time",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Watchers",
    path: "/repos/{OWNER}/{REPO}/subscribers",
    method: "GET",
    description: "List watchers - track engagement metrics",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Forks",
    path: "/repos/{OWNER}/{REPO}/forks",
    method: "GET",
    description: "List repository forks - measure repository impact",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },

  // ===== Pull Request Details =====
  {
    label: "List PR Files",
    path: "/repos/{OWNER}/{REPO}/pulls/{PULL_NUMBER}/files",
    method: "GET",
    description: "Files changed in PR - analyze code change patterns",
    requiresParams: true,
    params: ["OWNER", "REPO", "PULL_NUMBER"],
  },
  {
    label: "Check if PR Merged",
    path: "/repos/{OWNER}/{REPO}/pulls/{PULL_NUMBER}/merge",
    method: "GET",
    description: "Check if a pull request has been merged",
    requiresParams: true,
    params: ["OWNER", "REPO", "PULL_NUMBER"],
  },

  // ===== Issue/PR Milestones =====
  {
    label: "List Milestones",
    path: "/repos/{OWNER}/{REPO}/milestones",
    method: "GET",
    description: "Repository milestones - track project progress",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Milestone",
    path: "/repos/{OWNER}/{REPO}/milestones/{MILESTONE_NUMBER}",
    method: "GET",
    description: "Specific milestone details with completion stats",
    requiresParams: true,
    params: ["OWNER", "REPO", "MILESTONE_NUMBER"],
  },

  // ===== Repository Metadata =====
  {
    label: "Get Repository Topics",
    path: "/repos/{OWNER}/{REPO}/topics",
    method: "GET",
    description: "Repository topic tags",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "Get Repository README",
    path: "/repos/{OWNER}/{REPO}/readme",
    method: "GET",
    description: "Repository README content",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },
  {
    label: "List Repository Labels",
    path: "/repos/{OWNER}/{REPO}/labels",
    method: "GET",
    description: "List all labels for repository issues and PRs",
    requiresParams: true,
    params: ["OWNER", "REPO"],
  },

  // ===== Organization Endpoints =====
  {
    label: "Get Organization",
    path: "/orgs/{ORG}",
    method: "GET",
    description: "Get organization information",
    requiresParams: true,
    params: ["ORG"],
  },
  {
    label: "List Organization Repositories",
    path: "/orgs/{ORG}/repos",
    method: "GET",
    description: "List repositories for an organization",
    requiresParams: true,
    params: ["ORG"],
  },
  {
    label: "List Organization Members",
    path: "/orgs/{ORG}/members",
    method: "GET",
    description: "List members of an organization",
    requiresParams: true,
    params: ["ORG"],
  },
];

export const githubServiceConfig = {
  name: "GitHub",
  integrationId: "github",
  endpoints: githubEndpoints,
  baseUrl: "https://api.github.com",
};

export async function fetchGitHubData(
  connectionId: string,
  endpoint: string,
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" = "GET",
) {
  if (!env.NANGO_SECRET_KEY_DEV) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Nango secret key not configured",
    });
  }

  const nango = new Nango({ secretKey: env.NANGO_SECRET_KEY_DEV });

  try {
    const response = await nango.proxy({
      connectionId,
      providerConfigKey: "github",
      endpoint,
      method,
    });

    return {
      data: response.data,
      status: response.status,
    };
  } catch (error) {
    console.error("[GitHub API Fetch]", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch data from GitHub",
    });
  }
}
