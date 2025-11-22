import type { Endpoint, ServiceConfig } from "@/lib/metrics/types";

export const name = "GitHub";
export const integrationId = "github";
export const baseUrl = "https://api.github.com";

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

export const serviceConfig: ServiceConfig = {
  name,
  integrationId,
  baseUrl,
  endpoints,
  exampleParams,
};
