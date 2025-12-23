/**
 * Linear Integration Registry
 * Single source of truth for all Linear-related configurations
 *
 * Note: Linear uses GraphQL API at https://api.linear.app/graphql
 * All queries are POST requests with GraphQL query in body
 *
 * Templates:
 * 1. User Issues - Track issues for a specific user across all teams/projects
 * 2. Project Issues - Track issues in a specific project
 * 3. Team Issues - Track issues for a specific team
 *
 * Each template fetches comprehensive data including:
 * - completedAt (for completed issues over time)
 * - createdAt (for created issues over time)
 * - state (for current open count)
 */
import type {
  Endpoint,
  MetricTemplate,
  ServiceConfig,
} from "@/lib/metrics/types";

// =============================================================================
// Metadata
// =============================================================================

export const name = "Linear";
export const integrationId = "linear";
export const baseUrl = "https://api.linear.app";

// =============================================================================
// GraphQL Query Helpers
// =============================================================================

function graphqlBody(
  query: string,
  variables?: Record<string, unknown>,
): string {
  return JSON.stringify({
    query,
    variables: variables ?? {},
  });
}

// =============================================================================
// Metric Templates
// =============================================================================

export const templates: MetricTemplate[] = [
  // ===== User Issues (Workspace-scoped, across all teams/projects) =====
  {
    templateId: "linear-user-issues",
    label: "User Issues",
    description: "Track issues for a team member across all teams and projects",
    integrationId: "linear",
    metricType: "number",
    defaultUnit: "issues",

    metricEndpoint: "/graphql",
    method: "POST",
    requestBody: graphqlBody(
      `
      query UserIssues($userId: ID!) {
        issues(
          filter: { assignee: { id: { eq: $userId } } }
          first: 250
          orderBy: updatedAt
        ) {
          nodes {
            id
            title
            createdAt
            completedAt
            canceledAt
            state {
              name
              type
            }
            estimate
            priority
            project {
              id
              name
            }
            team {
              id
              name
            }
          }
        }
      }
    `,
      { userId: "{USER_ID}" },
    ),

    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    extractionPrompt: `
RESPONSE STRUCTURE: data.issues.nodes[]

WHAT WE TRACK: Issues completed over time (when work was DONE, not when created)

TIMESTAMP: Use "completedAt" field as the canonical timestamp.
- Skip issues where completedAt is null (still open or canceled)
- Normalize to midnight UTC for daily grouping

VALUE (primary): Count of issues completed per day (always value=1 per issue)

DIMENSIONS (store with each data point - user can switch tracking in UI):
- estimate: Story points (number or null) - for tracking effort/velocity
- priority: Priority level (0-4)
- teamName: team.name (string)
- projectName: project.name (string, may be null)

AGGREGATION: SUM per day for counts. When user tracks "estimate" dimension,
they see total story points completed per day instead of issue count.

IMPORTANT: Always store estimate as dimension so users can choose between
tracking "issue count" vs "total effort points completed" per day.
`,

    requiredParams: [
      {
        name: "USER_ID",
        label: "Team Member",
        description: "Select a team member to track their issues",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a team member",
        dynamicConfig: {
          endpoint: "/graphql",
          method: "POST",
          body: graphqlBody(`
            query Users {
              users(first: 100) {
                nodes {
                  id
                  name
                  email
                  active
                }
              }
            }
          `),
        },
      },
    ],
  },

  // ===== Project Issues =====
  {
    templateId: "linear-project-issues",
    label: "Project Issues",
    description: "Track all issues in a specific project across teams",
    integrationId: "linear",
    metricType: "number",
    defaultUnit: "issues",

    metricEndpoint: "/graphql",
    method: "POST",
    requestBody: graphqlBody(
      `
      query ProjectIssues($projectId: String!) {
        project(id: $projectId) {
          id
          name
          state
          issues(first: 250, orderBy: updatedAt) {
            nodes {
              id
              title
              createdAt
              completedAt
              canceledAt
              state {
                name
                type
              }
              estimate
              priority
              assignee {
                id
                name
              }
              team {
                id
                name
              }
            }
          }
        }
      }
    `,
      { projectId: "{PROJECT_ID}" },
    ),

    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    extractionPrompt: `
RESPONSE STRUCTURE: data.project.issues.nodes[]

WHAT WE TRACK: Issues completed over time (when work was DONE, not when created)

TIMESTAMP: Use "completedAt" field as the canonical timestamp.
- Skip issues where completedAt is null (still open or canceled)
- Normalize to midnight UTC for daily grouping

VALUE (primary): Count of issues completed per day (always value=1 per issue)

DIMENSIONS (store with each data point - user can switch tracking in UI):
- estimate: Story points (number or null) - for tracking effort/velocity
- priority: Priority level (0-4)
- teamName: team.name (string)
- assigneeName: assignee.name (string, may be null)

AGGREGATION: SUM per day for counts. When user tracks "estimate" dimension,
they see total story points completed per day instead of issue count.

IMPORTANT: Always store estimate as dimension so users can choose between
tracking "issue count" vs "total effort points completed" per day.
`,

    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select a project to track",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a project",
        dynamicConfig: {
          endpoint: "/graphql",
          method: "POST",
          body: graphqlBody(`
            query Projects {
              projects(first: 100) {
                nodes {
                  id
                  name
                  state
                }
              }
            }
          `),
        },
      },
    ],
  },

  // ===== Team Issues =====
  {
    templateId: "linear-team-issues",
    label: "Team Issues",
    description: "Track all issues for a specific team",
    integrationId: "linear",
    metricType: "number",
    defaultUnit: "issues",

    metricEndpoint: "/graphql",
    method: "POST",
    requestBody: graphqlBody(
      `
      query TeamIssues($teamId: String!) {
        team(id: $teamId) {
          id
          name
          issues(first: 250, orderBy: updatedAt) {
            nodes {
              id
              title
              createdAt
              completedAt
              canceledAt
              state {
                name
                type
              }
              estimate
              priority
              assignee {
                id
                name
              }
              project {
                id
                name
              }
            }
          }
        }
      }
    `,
      { teamId: "{TEAM_ID}" },
    ),

    historicalDataLimit: "90d",
    defaultPollFrequency: "daily",
    isTimeSeries: true,

    extractionPrompt: `
RESPONSE STRUCTURE: data.team.issues.nodes[]

WHAT WE TRACK: Issues completed over time (when work was DONE, not when created)

TIMESTAMP: Use "completedAt" field as the canonical timestamp.
- Skip issues where completedAt is null (still open or canceled)
- Normalize to midnight UTC for daily grouping

VALUE (primary): Count of issues completed per day (always value=1 per issue)

DIMENSIONS (store with each data point - user can switch tracking in UI):
- estimate: Story points (number or null) - for tracking effort/velocity
- priority: Priority level (0-4)
- projectName: project.name (string, may be null)
- assigneeName: assignee.name (string, may be null)

AGGREGATION: SUM per day for counts. When user tracks "estimate" dimension,
they see total story points completed per day instead of issue count.

IMPORTANT: Always store estimate as dimension so users can choose between
tracking "issue count" vs "total effort points completed" per day.
`,

    requiredParams: [
      {
        name: "TEAM_ID",
        label: "Team",
        description: "Select a team to track",
        type: "dynamic-select",
        required: true,
        placeholder: "Select a team",
        dynamicConfig: {
          endpoint: "/graphql",
          method: "POST",
          body: graphqlBody(`
            query Teams {
              teams(first: 100) {
                nodes {
                  id
                  name
                  key
                }
              }
            }
          `),
        },
      },
    ],
  },
];

// =============================================================================
// API Endpoints (for testing/debugging)
// =============================================================================

export const endpoints: Endpoint[] = [
  {
    label: "List Users",
    path: "/graphql",
    method: "POST",
    description: "List all users in the workspace",
  },
  {
    label: "List Teams",
    path: "/graphql",
    method: "POST",
    description: "List all teams",
  },
  {
    label: "List Projects",
    path: "/graphql",
    method: "POST",
    description: "List all projects",
  },
  {
    label: "User Issues",
    path: "/graphql",
    method: "POST",
    description: "Get issues for a specific user",
    requiresParams: true,
    params: ["USER_ID"],
  },
  {
    label: "Team Issues",
    path: "/graphql",
    method: "POST",
    description: "Get issues for a specific team",
    requiresParams: true,
    params: ["TEAM_ID"],
  },
  {
    label: "Project Issues",
    path: "/graphql",
    method: "POST",
    description: "Get issues for a specific project",
    requiresParams: true,
    params: ["PROJECT_ID"],
  },
];

export const exampleParams = {
  USER_ID: "user-id-here",
  TEAM_ID: "team-id-here",
  PROJECT_ID: "project-id-here",
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
