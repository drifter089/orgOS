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
}

// ============================================================================
// GitHub Templates
// ============================================================================

export const githubTemplates: MetricTemplate[] = [
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
];

// ============================================================================
// PostHog Templates
// ============================================================================

export const posthogTemplates: MetricTemplate[] = [
  {
    templateId: "posthog-event-count",
    label: "Event Count",
    description: "Count occurrences of a specific event in a project",
    integrationId: "posthog",
    metricType: "number",
    defaultUnit: "events",
    endpoint: posthogMetricEndpoints.PROJECT_EVENTS,
    dataPath: "results", // Will count array length
    transformData: "countEvents",
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
];

// ============================================================================
// YouTube Templates
// ============================================================================

export const youtubeTemplates: MetricTemplate[] = [
  {
    templateId: "youtube-video-views",
    label: "Video Views",
    description: "Total view count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "views",
    endpoint: youtubeMetricEndpoints.VIDEO_STATS,
    dataPath: "items.0.statistics.viewCount",
    requiredParams: [
      {
        name: "VIDEO_ID",
        label: "Video ID",
        description: "The YouTube video ID (e.g., dQw4w9WgXcQ from the URL)",
        type: "text",
        required: true,
        placeholder: "dQw4w9WgXcQ",
      },
    ],
  },
  {
    templateId: "youtube-video-likes",
    label: "Video Likes",
    description: "Total like count for a specific video",
    integrationId: "youtube",
    metricType: "number",
    defaultUnit: "likes",
    endpoint: youtubeMetricEndpoints.VIDEO_STATS,
    dataPath: "items.0.statistics.likeCount",
    requiredParams: [
      {
        name: "VIDEO_ID",
        label: "Video ID",
        description: "The YouTube video ID",
        type: "text",
        required: true,
        placeholder: "dQw4w9WgXcQ",
      },
    ],
  },
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
