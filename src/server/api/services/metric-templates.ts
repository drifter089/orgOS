/**
 * Metric Templates Configuration
 *
 * Defines predefined metric templates for integration-backed metrics.
 * Each template specifies how to fetch and extract metric values from integration APIs.
 *
 * IMPORTANT: Endpoints are imported from service files to maintain single source of truth
 * @see src/server/api/services/github.ts
 * @see src/server/api/services/google-sheets.ts
 * @see src/server/api/services/posthog.ts
 * @see src/server/api/services/youtube.ts
 */
import { githubMetricEndpoints } from "./github";
import { googleSheetsMetricEndpoints } from "./google-sheets";
import { posthogMetricEndpoints } from "./posthog";
import { youtubeMetricEndpoints } from "./youtube";
import { youtubeAnalyticsMetricEndpoints } from "./youtube-analytics";

export type MetricType = "percentage" | "number" | "duration" | "rate";

export interface MetricTemplateParam {
  name: string;
  label: string;
  description: string;
  type: "text" | "number" | "select" | "dynamic-select";
  required: boolean;
  placeholder?: string;
  options?: Array<{ label: string; value: string }>; // For static select
  dynamicOptionsEndpoint?: string; // For dynamic-select: tRPC endpoint to fetch options
  dependsOn?: string; // For cascading selects: which param this depends on
}

export interface MetricTemplate {
  templateId: string;
  label: string;
  description: string;
  integrationId: string; // Must match Integration.integrationId
  metricType: MetricType;
  defaultUnit?: string;

  // Endpoint configuration
  endpoint: string; // API endpoint path
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

  // Data extraction
  dataPath: string; // JSON path to extract value (e.g., "stargazers_count", "data.0.value")

  // Parameters required from user
  requiredParams?: MetricTemplateParam[];

  // Optional custom data transformation
  transformData?: string; // Function name for custom transformation

  // Request body for POST/PUT requests (with {PARAM} placeholders)
  requestBodyTemplate?: string; // JSON string template with placeholders
}

// ============================================================================
// GitHub Templates
// ============================================================================

// Common parameter definitions for reuse
const githubRepoParams: MetricTemplateParam[] = [
  {
    name: "OWNER",
    label: "Repository Owner",
    description: "GitHub username or organization name",
    type: "text",
    required: true,
    placeholder: "facebook",
  },
  {
    name: "REPO",
    label: "Repository Name",
    description: "Name of the repository",
    type: "text",
    required: true,
    placeholder: "react",
  },
];

export const githubTemplates: MetricTemplate[] = [
  // ===== User-Level Metrics (No Repo Required) =====
  {
    templateId: "github-stars-total",
    label: "Repository Stars",
    description: "Total number of stars across all your repositories",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "stars",
    endpoint: githubMetricEndpoints.USER_PROFILE,
    dataPath: "public_repos", // Note: This gets repo count, stars need custom aggregation
    requiredParams: [],
  },
  {
    templateId: "github-repos-count",
    label: "Public Repositories",
    description: "Total count of public repositories",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "repos",
    endpoint: githubMetricEndpoints.USER_PROFILE,
    dataPath: "public_repos",
    requiredParams: [],
  },
  {
    templateId: "github-followers-count",
    label: "Followers",
    description: "Total number of GitHub followers",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "followers",
    endpoint: githubMetricEndpoints.USER_PROFILE,
    dataPath: "followers",
    requiredParams: [],
  },

  // ===== Repository Info Metrics =====
  {
    templateId: "github-repo-stars",
    label: "Repository Stars",
    description: "Star count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "stars",
    endpoint: githubMetricEndpoints.REPO_INFO,
    dataPath: "stargazers_count",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-repo-forks",
    label: "Repository Forks",
    description: "Fork count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "forks",
    endpoint: githubMetricEndpoints.REPO_INFO,
    dataPath: "forks_count",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-repo-watchers",
    label: "Repository Watchers",
    description: "Watcher count for a specific repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "watchers",
    endpoint: githubMetricEndpoints.REPO_INFO,
    dataPath: "watchers_count",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-repo-open-issues",
    label: "Open Issues Count",
    description: "Number of open issues in a repository",
    integrationId: "github",
    metricType: "number",
    defaultUnit: "issues",
    endpoint: githubMetricEndpoints.REPO_INFO,
    dataPath: "open_issues_count",
    requiredParams: githubRepoParams,
  },

  // ===== Time-Series Data (Excellent for Charts) =====
  {
    templateId: "github-commit-activity",
    label: "Commit Activity (Last Year)",
    description:
      "Weekly commit activity for the last year. Returns array of {week, total, days} - perfect for time-series line charts.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_STATS_COMMIT_ACTIVITY,
    dataPath: "results", // Full array for visualization
    transformData: "extractCommitActivity",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-code-frequency",
    label: "Code Frequency (Additions/Deletions)",
    description:
      "Weekly code additions and deletions. Returns array of [timestamp, additions, deletions] - excellent for area/bar charts showing code growth.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_STATS_CODE_FREQUENCY,
    dataPath: "results", // Full array for visualization
    transformData: "extractCodeFrequency",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-participation",
    label: "Participation Stats (52 Weeks)",
    description:
      "Weekly commit counts for owner vs all contributors over last 52 weeks. Perfect for comparative area charts.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_STATS_PARTICIPATION,
    dataPath: "results", // Returns {all: [...], owner: [...]}
    transformData: "extractParticipation",
    requiredParams: githubRepoParams,
  },

  // ===== Contributor & Distribution Data =====
  {
    templateId: "github-contributor-stats",
    label: "Contributor Statistics",
    description:
      "Detailed commit statistics per contributor including weekly breakdown. Great for bar charts and contributor leaderboards.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_STATS_CONTRIBUTORS,
    dataPath: "results", // Array of contributor objects with commit data
    transformData: "extractContributorStats",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-punch-card",
    label: "Commit Punch Card",
    description:
      "Hourly commit distribution by day of week. Returns array of [day, hour, count] - perfect for heatmap visualizations.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_STATS_PUNCH_CARD,
    dataPath: "results", // Full array for heatmap
    transformData: "extractPunchCard",
    requiredParams: githubRepoParams,
  },
  {
    templateId: "github-languages",
    label: "Repository Languages",
    description:
      "Programming languages used in repository with byte counts. Perfect for pie/donut charts showing language distribution.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_LANGUAGES,
    dataPath: "results", // Object with language: bytes
    transformData: "extractLanguages",
    requiredParams: githubRepoParams,
  },

  // ===== List-Based Metrics =====
  {
    templateId: "github-issues-list",
    label: "Issues List",
    description:
      "List of repository issues with details. Useful for tracking issue trends and analysis.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_ISSUES,
    dataPath: "results", // Full array of issues
    transformData: "extractIssuesList",
    requiredParams: [
      ...githubRepoParams,
      {
        name: "STATE",
        label: "Issue State",
        description: "Filter issues by state",
        type: "select",
        required: true,
        options: [
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "All", value: "all" },
        ],
      },
    ],
  },
  {
    templateId: "github-pulls-list",
    label: "Pull Requests List",
    description:
      "List of repository pull requests with details. Track PR velocity and review patterns.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_PULLS,
    dataPath: "results", // Full array of PRs
    transformData: "extractPullsList",
    requiredParams: [
      ...githubRepoParams,
      {
        name: "STATE",
        label: "PR State",
        description: "Filter pull requests by state",
        type: "select",
        required: true,
        options: [
          { label: "Open", value: "open" },
          { label: "Closed", value: "closed" },
          { label: "All", value: "all" },
        ],
      },
    ],
  },
  {
    templateId: "github-commits-list",
    label: "Recent Commits",
    description:
      "List of recent repository commits with author and message details. Track commit frequency over time.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_COMMITS,
    dataPath: "results", // Full array of commits
    transformData: "extractCommitsList",
    requiredParams: githubRepoParams,
  },

  // ===== CI/CD Metrics =====
  {
    templateId: "github-workflow-runs",
    label: "Workflow Runs",
    description:
      "GitHub Actions workflow runs with status and timing. Track CI/CD success rates and performance.",
    integrationId: "github",
    metricType: "number",
    endpoint: githubMetricEndpoints.REPO_WORKFLOW_RUNS,
    dataPath: "workflow_runs", // Array of workflow run objects
    transformData: "extractWorkflowRuns",
    requiredParams: githubRepoParams,
  },
];

// ============================================================================
// Google Sheets Templates
// ============================================================================

export const googleSheetsTemplates: MetricTemplate[] = [
  {
    templateId: "gsheets-cell-value",
    label: "Spreadsheet Cell Value",
    description: "Read a numeric value from a specific cell in a Google Sheet",
    integrationId: "google-sheet",
    metricType: "number",
    endpoint: googleSheetsMetricEndpoints.RANGE_VALUES,
    dataPath: "values.0.0", // First row, first column
    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description:
          "The ID from the spreadsheet URL (e.g., 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms)",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "RANGE",
        label: "Cell Range",
        description:
          "The A1 notation of the cell or range (e.g., Sheet1!A1 or B2:B5)",
        type: "text",
        required: true,
        placeholder: "Sheet1!A1",
      },
    ],
  },
  {
    templateId: "gsheets-row-count",
    label: "Row Count",
    description: "Count the number of rows in a specified range",
    integrationId: "google-sheet",
    metricType: "number",
    defaultUnit: "rows",
    endpoint: googleSheetsMetricEndpoints.RANGE_VALUES,
    dataPath: "values", // Will count array length
    transformData: "countRows",
    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description: "The ID from the spreadsheet URL",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "RANGE",
        label: "Range",
        description: "The range to count rows in (e.g., Sheet1!A:A)",
        type: "text",
        required: true,
        placeholder: "Sheet1!A:A",
      },
    ],
  },
  {
    templateId: "gsheets-column-data",
    label: "Column Data (Full Dataset)",
    description:
      "Track all values in a column for visualization and plotting. Stores full column data + latest value.",
    integrationId: "google-sheet",
    metricType: "number",
    endpoint: googleSheetsMetricEndpoints.SHEET_VALUES,
    dataPath: "values", // Full column array (will be processed in refresh logic)
    transformData: "extractColumn", // Custom transformation to extract column
    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description: "The ID from the spreadsheet URL",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "SHEET_NAME",
        label: "Sheet Name",
        description: "The name of the sheet (e.g., Sheet1)",
        type: "text",
        required: true,
        placeholder: "Sheet1",
      },
      {
        name: "COLUMN_INDEX",
        label: "Column Index",
        description: "Column index (0-based, e.g., 0 for column A)",
        type: "number",
        required: true,
        placeholder: "0",
      },
    ],
  },
  {
    templateId: "gsheets-multi-column-data",
    label: "Multi-Column Data (Full Dataset)",
    description:
      "Track multiple columns for rich visualization. Stores all selected column data for charts with multiple series.",
    integrationId: "google-sheet",
    metricType: "number",
    endpoint: googleSheetsMetricEndpoints.SHEET_VALUES,
    dataPath: "values", // Full sheet data
    transformData: "extractMultipleColumns", // Custom transformation
    requiredParams: [
      {
        name: "SPREADSHEET_ID",
        label: "Spreadsheet ID",
        description: "The ID from the spreadsheet URL",
        type: "text",
        required: true,
        placeholder: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      },
      {
        name: "SHEET_NAME",
        label: "Sheet Name",
        description: "The name of the sheet (e.g., Sheet1)",
        type: "text",
        required: true,
        placeholder: "Sheet1",
      },
      {
        name: "LABEL_COLUMN_INDEX",
        label: "Label Column Index",
        description:
          "Column index for labels/x-axis (0-based, e.g., 0 for column A with dates)",
        type: "number",
        required: true,
        placeholder: "0",
      },
      {
        name: "DATA_COLUMN_INDICES",
        label: "Data Column Indices",
        description:
          "Comma-separated column indices for data series (e.g., 1,2,3 for columns B,C,D)",
        type: "text",
        required: true,
        placeholder: "1,2,3",
      },
    ],
  },
];

// ============================================================================
// PostHog Templates
// ============================================================================

export const posthogTemplates: MetricTemplate[] = [
  {
    templateId: "posthog-event-count",
    label: "Event Count (Time Series)",
    description:
      "Count occurrences of a specific event over time. Returns daily counts for visualization.",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "events",
    endpoint: posthogMetricEndpoints.QUERY_API,
    method: "POST",
    dataPath: "results", // HogQL results array
    requestBodyTemplate:
      '{"query":{"kind":"HogQLQuery","query":"SELECT formatDateTime(timestamp, \'%Y-%m-%d\') as date, count() as count FROM events WHERE event = \'{EVENT_NAME}\' AND timestamp > now() - INTERVAL 30 DAY GROUP BY date ORDER BY date"}}',
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
      {
        name: "EVENT_NAME",
        label: "Event",
        description: "Select the event to track",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-events",
        dependsOn: "PROJECT_ID",
      },
    ],
  },
  {
    templateId: "posthog-active-users",
    label: "Active Users",
    description: "Count of active users in a project",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "users",
    endpoint: posthogMetricEndpoints.PROJECT_PERSONS,
    dataPath: "count",
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
    ],
  },
  {
    templateId: "posthog-hogql-query",
    label: "HogQL Query (Custom SQL)",
    description:
      "Run a custom HogQL SQL query to get analytics data. Returns full result for visualization.",
    integrationId: "posthog",
    metricType: "number",
    endpoint: posthogMetricEndpoints.QUERY_API,
    method: "POST",
    dataPath: "results", // Full results array for visualization
    transformData: "extractHogQLResults",
    requestBodyTemplate:
      '{"query":{"kind":"HogQLQuery","query":"{HOGQL_QUERY}"}}',
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
      {
        name: "HOGQL_QUERY",
        label: "HogQL Query",
        description:
          "SQL query using HogQL syntax. Example: SELECT event, count() as count FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count DESC LIMIT 10",
        type: "text",
        required: true,
        placeholder:
          "SELECT event, count() as count FROM events WHERE timestamp > now() - INTERVAL 7 DAY GROUP BY event ORDER BY count DESC LIMIT 10",
      },
    ],
  },
  {
    templateId: "posthog-trends-query",
    label: "Trends Query (Time Series)",
    description:
      "Get event trends over time. Returns time-series data perfect for line/area charts.",
    integrationId: "posthog",
    metricType: "number",
    endpoint: posthogMetricEndpoints.QUERY_API,
    method: "POST",
    dataPath: "results", // Full results for time-series visualization
    transformData: "extractTrendsResults",
    requestBodyTemplate:
      '{"query":{"kind":"TrendsQuery","series":[{"event":"{EVENT_NAME}"}],"trendsFilter":{"display":"ActionsLineGraph"},"dateRange":{"date_from":"{DATE_FROM}"}}}',
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
      {
        name: "EVENT_NAME",
        label: "Event",
        description: "Select the event to track trends for",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-events",
        dependsOn: "PROJECT_ID",
      },
      {
        name: "DATE_FROM",
        label: "Date Range",
        description: "How far back to query (e.g., -7d, -30d, -90d)",
        type: "select",
        required: true,
        options: [
          { label: "Last 7 days", value: "-7d" },
          { label: "Last 14 days", value: "-14d" },
          { label: "Last 30 days", value: "-30d" },
          { label: "Last 90 days", value: "-90d" },
        ],
      },
    ],
  },
  {
    templateId: "posthog-saved-insight",
    label: "Saved Insight",
    description:
      "Fetch data from a saved insight in PostHog. Great for reusing existing analyses.",
    integrationId: "posthog",
    metricType: "number",
    endpoint: posthogMetricEndpoints.INSIGHT_DETAIL,
    method: "GET",
    dataPath: "result", // Insight result data
    transformData: "extractInsightResults",
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
      {
        name: "INSIGHT_ID",
        label: "Insight",
        description: "Select the saved insight to fetch",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-insights",
        dependsOn: "PROJECT_ID",
      },
    ],
  },
  {
    templateId: "posthog-events-list",
    label: "Events List (Raw Data)",
    description:
      "Fetch raw event data with all properties. Useful for detailed analysis and custom visualizations.",
    integrationId: "posthog",
    metricType: "number",
    endpoint: posthogMetricEndpoints.QUERY_API,
    method: "POST",
    dataPath: "results",
    transformData: "extractEventsResults",
    requestBodyTemplate:
      '{"query":{"kind":"EventsQuery","select":["*","event","timestamp","properties"],"event":"{EVENT_NAME}","limit":{LIMIT},"orderBy":["timestamp DESC"]}}',
    requiredParams: [
      {
        name: "PROJECT_ID",
        label: "Project",
        description: "Select the PostHog project",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-projects",
      },
      {
        name: "EVENT_NAME",
        label: "Event",
        description: "Select the event to fetch",
        type: "dynamic-select",
        required: true,
        dynamicOptionsEndpoint: "posthog-events",
        dependsOn: "PROJECT_ID",
      },
      {
        name: "LIMIT",
        label: "Limit",
        description: "Maximum number of events to fetch",
        type: "select",
        required: true,
        options: [
          { label: "50 events", value: "50" },
          { label: "100 events", value: "100" },
          { label: "500 events", value: "500" },
          { label: "1000 events", value: "1000" },
        ],
      },
    ],
  },
];

// ============================================================================
// YouTube Templates
// ============================================================================

// Common VIDEO_ID parameter with dynamic selection
const youtubeVideoParam: MetricTemplateParam = {
  name: "VIDEO_ID",
  label: "Select Video",
  description: "Select a video from your channel",
  type: "dynamic-select",
  required: true,
  dynamicOptionsEndpoint: "youtube.getMyVideos",
  placeholder: "Select a video...",
};

export const youtubeTemplates: MetricTemplate[] = [
  // ============================================================================
  // Channel Lifetime Metrics (Data API)
  // ============================================================================
  {
    templateId: "youtube-channel-subscribers",
    label: "Channel Subscribers",
    description: "Total subscriber count for your channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "subscribers",
    endpoint: youtubeMetricEndpoints.CHANNEL_STATS,
    dataPath: "items.0.statistics.subscriberCount",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-views",
    label: "Channel Total Views",
    description: "Lifetime view count across all channel videos",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeMetricEndpoints.CHANNEL_STATS,
    dataPath: "items.0.statistics.viewCount",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-video-count",
    label: "Channel Video Count",
    description: "Total number of videos on your channel",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "videos",
    endpoint: youtubeMetricEndpoints.CHANNEL_STATS,
    dataPath: "items.0.statistics.videoCount",
    requiredParams: [],
  },

  // ============================================================================
  // Channel Analytics Time Series (28 Days - Analytics API)
  // These return daily data for plotting, not aggregated values
  // ============================================================================
  {
    templateId: "youtube-channel-daily-views-28d",
    label: "Daily Views (28 Days)",
    description: "Daily view counts for the last 28 days - for plotting",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.CHANNEL_DAILY_VIEWS_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-daily-watch-time-28d",
    label: "Daily Watch Time (28 Days)",
    description: "Daily minutes watched for the last 28 days - for plotting",
    integrationId: "youtube",
    metricType: "duration",
    defaultUnit: "minutes",
    endpoint: youtubeAnalyticsMetricEndpoints.CHANNEL_DAILY_WATCH_TIME_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-daily-avg-duration-28d",
    label: "Daily Avg Duration (28 Days)",
    description:
      "Daily average view duration for the last 28 days - for plotting",
    integrationId: "youtube",
    metricType: "duration",
    defaultUnit: "seconds",
    endpoint:
      youtubeAnalyticsMetricEndpoints.CHANNEL_DAILY_AVG_VIEW_DURATION_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-daily-subscribers-28d",
    label: "Daily Subscribers (28 Days)",
    description:
      "Daily subscriber gains/losses for the last 28 days - for plotting",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "subscribers",
    endpoint: youtubeAnalyticsMetricEndpoints.CHANNEL_DAILY_SUBSCRIBERS_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-channel-daily-engagement-28d",
    label: "Daily Engagement (28 Days)",
    description:
      "Daily likes, comments, shares for the last 28 days - for plotting",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "interactions",
    endpoint: youtubeAnalyticsMetricEndpoints.CHANNEL_DAILY_ENGAGEMENT_28D,
    dataPath: "rows",
    requiredParams: [],
  },

  // ============================================================================
  // Channel Comparison & Breakdown Metrics (28 Days)
  // ============================================================================
  {
    templateId: "youtube-top-videos-by-views-28d",
    label: "Top Videos by Views (28 Days)",
    description: "Your top 25 videos ranked by views with full metrics",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.TOP_VIDEOS_BY_VIEWS_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-top-videos-by-watch-time-28d",
    label: "Top Videos by Watch Time (28 Days)",
    description: "Your top 25 videos ranked by watch time",
    integrationId: "youtube",
    metricType: "duration",
    defaultUnit: "minutes",
    endpoint: youtubeAnalyticsMetricEndpoints.TOP_VIDEOS_BY_WATCH_TIME_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-traffic-sources-28d",
    label: "Traffic Sources (28 Days)",
    description:
      "Where your views come from (search, suggested, external, etc.)",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.TRAFFIC_SOURCES_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-geographic-28d",
    label: "Geographic Breakdown (28 Days)",
    description: "Views by country for the last 28 days",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.GEOGRAPHIC_28D,
    dataPath: "rows",
    requiredParams: [],
  },
  {
    templateId: "youtube-device-28d",
    label: "Device Breakdown (28 Days)",
    description: "Views by device type (mobile, desktop, tablet, TV)",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.DEVICE_28D,
    dataPath: "rows",
    requiredParams: [],
  },

  // ============================================================================
  // Video Lifetime Metrics (Data API)
  // ============================================================================
  {
    templateId: "youtube-video-views",
    label: "Video Views (Lifetime)",
    description: "Total view count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeMetricEndpoints.VIDEO_STATS,
    dataPath: "items.0.statistics.viewCount",
    requiredParams: [youtubeVideoParam],
  },
  {
    templateId: "youtube-video-likes",
    label: "Video Likes (Lifetime)",
    description: "Total like count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "likes",
    endpoint: youtubeMetricEndpoints.VIDEO_STATS,
    dataPath: "items.0.statistics.likeCount",
    requiredParams: [youtubeVideoParam],
  },
  {
    templateId: "youtube-video-comments",
    label: "Video Comments (Lifetime)",
    description: "Total comment count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "comments",
    endpoint: youtubeMetricEndpoints.VIDEO_STATS,
    dataPath: "items.0.statistics.commentCount",
    requiredParams: [youtubeVideoParam],
  },

  // ============================================================================
  // Video Analytics Time Series (28 Days - Analytics API)
  // These return daily data for plotting, not aggregated values
  // ============================================================================
  {
    templateId: "youtube-video-daily-views-28d",
    label: "Video Daily Views (28 Days)",
    description: "Daily view counts for a specific video - for plotting",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeAnalyticsMetricEndpoints.VIDEO_DAILY_VIEWS_28D,
    dataPath: "rows",
    requiredParams: [youtubeVideoParam],
  },
  {
    templateId: "youtube-video-daily-watch-time-28d",
    label: "Video Daily Watch Time (28 Days)",
    description: "Daily minutes watched for a specific video - for plotting",
    integrationId: "youtube",
    metricType: "duration",
    defaultUnit: "minutes",
    endpoint: youtubeAnalyticsMetricEndpoints.VIDEO_DAILY_WATCH_TIME_28D,
    dataPath: "rows",
    requiredParams: [youtubeVideoParam],
  },
  {
    templateId: "youtube-video-daily-engagement-28d",
    label: "Video Daily Engagement (28 Days)",
    description:
      "Daily likes, comments, shares for a specific video - for plotting",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "interactions",
    endpoint: youtubeAnalyticsMetricEndpoints.VIDEO_DAILY_ENGAGEMENT_28D,
    dataPath: "rows",
    requiredParams: [youtubeVideoParam],
  },
];

// ============================================================================
// Registry
// ============================================================================

export const allMetricTemplates: MetricTemplate[] = [
  ...githubTemplates,
  ...googleSheetsTemplates,
  ...posthogTemplates,
  ...youtubeTemplates,
];

/**
 * Get all metric templates
 */
export function getAllMetricTemplates(): MetricTemplate[] {
  return allMetricTemplates;
}

/**
 * Get templates for a specific integration
 */
export function getTemplatesByIntegration(
  integrationId: string,
): MetricTemplate[] {
  return allMetricTemplates.filter((t) => t.integrationId === integrationId);
}

/**
 * Get a specific template by ID
 */
export function getMetricTemplate(
  templateId: string,
): MetricTemplate | undefined {
  return allMetricTemplates.find((t) => t.templateId === templateId);
}

/**
 * Get list of all supported integration IDs that have templates
 */
export function getIntegrationIdsWithTemplates(): string[] {
  return Array.from(new Set(allMetricTemplates.map((t) => t.integrationId)));
}
