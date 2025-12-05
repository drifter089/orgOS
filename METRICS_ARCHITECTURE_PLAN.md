# Metrics Architecture Plan

## Overview

This document outlines the new architecture for the metrics system. The goal is to make metrics:

- **Automatic**: Data fetched on schedule, not manually
- **Scalable**: Single table structure, no schema explosion
- **Efficient**: AI code generation happens once, reused thereafter
- **Flexible**: Users can customize visualizations independently

---

## Current Architecture (Problems)

```
User creates metric
       ↓
Manual refresh trigger
       ↓
Fetch data via Nango → Raw API response
       ↓
AI transforms raw data → Chart config (EVERY TIME)
       ↓
Save to DashboardMetric.graphConfig
       ↓
Display chart
```

### Issues

| Problem                          | Impact                                     |
| -------------------------------- | ------------------------------------------ |
| Manual refresh only              | Users must click to update data            |
| AI called every refresh          | Slow, expensive, unpredictable             |
| No historical data storage       | Can't show trends, only current snapshot   |
| Chart config is the only storage | Lose raw data after transformation         |
| No code reuse                    | Same template = same AI call for every org |

---

## New Architecture (Proposed)

```
                           ┌─────────────────────────────────────┐
                           │        METRIC CREATION              │
                           └─────────────────────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │  Check: MetricTransformer exists for template? │
                    └──────────────────────────────────────────────┘
                           │                    │
                       YES │                    │ NO
                           ▼                    ▼
                    Use existing         1. Fetch sample data from API
                    transformer          2. Pass to AI with schema
                           │             3. AI generates TypeScript transformer
                           │             4. Save to MetricTransformer
                           │                    │
                           └────────┬───────────┘
                                    ▼
                    ┌──────────────────────────────────────────────┐
                    │  Fetch historical data (historicalEndpoint)   │
                    │  Execute transformer → MetricDataPoint rows   │
                    └──────────────────────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────────────────────┐
                    │  AI generates ChartTransformer for this       │
                    │  DashboardMetric based on data shape          │
                    │  Execute → Initial graphConfig                │
                    └──────────────────────────────────────────────┘


                           ┌─────────────────────────────────────┐
                           │      POLLING (Vercel Cron)          │
                           └─────────────────────────────────────┘
                                           │
                           Every 15 min / hourly / daily
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │  For each Metric where nextPollAt < NOW():    │
                    │  1. Fetch data via pollingEndpoint            │
                    │  2. Execute saved MetricTransformer           │
                    │  3. Upsert into MetricDataPoint               │
                    └──────────────────────────────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │  For each related DashboardMetric:            │
                    │  1. Query MetricDataPoints                    │
                    │  2. Execute saved ChartTransformer            │
                    │  3. Update DashboardMetric.graphConfig        │
                    └──────────────────────────────────────────────┘
```

---

## Database Schema Changes

### Existing Tables (Keep As-Is, With Additions)

#### Metric (add polling fields)

```prisma
model Metric {
  // ... existing fields ...

  // NEW: Polling configuration
  pollFrequency  String    @default("daily")  // "hourly", "daily", "weekly", "manual"
  nextPollAt     DateTime?                     // When to poll next
  lastFetchedAt  DateTime?                     // Last successful fetch
  lastError      String?                       // Last error message

  // NEW: Relation to data points
  dataPoints     MetricDataPoint[]
}
```

#### DashboardMetric (add chart transformer relation)

```prisma
model DashboardMetric {
  // ... existing fields ...

  // NEW: Chart transformer relation
  chartTransformerId String?
  chartTransformer   ChartTransformer? @relation(fields: [chartTransformerId], references: [id])
}
```

### New Tables

#### MetricDataPoint (Time-Series Storage)

Single table for ALL metrics. No table-per-template.

```prisma
model MetricDataPoint {
  id        String   @id @default(cuid())
  metricId  String
  metric    Metric   @relation(fields: [metricId], references: [id], onDelete: Cascade)

  // Time dimension - always required
  timestamp DateTime

  // Primary value - always filled
  value     Float

  // Secondary values - optional, for additional related data
  dimensions Json?    // {"additions": 500, "deletions": 200} or {"likes": 50, "comments": 10}

  createdAt DateTime @default(now())

  // Indexes for time-series queries
  @@index([metricId, timestamp(sort: Desc)])
  @@index([timestamp(sort: Desc)])

  // Prevent duplicate data points for same metric at same timestamp
  @@unique([metricId, timestamp])
}
```

**Design Decisions:**

| Column       | Purpose                           | Always Filled | Example                                 |
| ------------ | --------------------------------- | ------------- | --------------------------------------- |
| `value`      | Primary metric number             | YES           | Stars: 15000, Views: 10000, Commits: 50 |
| `dimensions` | Additional related values (JSONB) | NO            | `{likes: 50, comments: 10}` or `null`   |

**Why only two data columns:**

- **Simplicity**: No need for `dimensionKey`/`dimensionValue` columns - too complex
- **Flexibility**: `dimensions` JSONB can hold any additional data the API returns
- **Multi-line charts**: Can use `dimensions` for related metrics (e.g., GitHub code additions + deletions)
- **Primary value**: `value` is indexed and fast for simple queries
- **ChartTransformer handles complexity**: The chart transformer can extract from `dimensions` when needed

**Example Data:**

```
Simple metric (GitHub stars):
┌──────────┬────────────┬────────┬────────────┐
│ metricId │ timestamp  │ value  │ dimensions │
├──────────┼────────────┼────────┼────────────┤
│ abc      │ 2024-12-01 │ 14500  │ null       │
│ abc      │ 2024-12-02 │ 14650  │ null       │
│ abc      │ 2024-12-03 │ 14800  │ null       │
└──────────┴────────────┴────────┴────────────┘

YouTube video stats (views as primary, others in dimensions):
┌──────────┬────────────┬───────┬─────────────────────────────────────────┐
│ metricId │ timestamp  │ value │ dimensions                              │
├──────────┼────────────┼───────┼─────────────────────────────────────────┤
│ xyz      │ 2024-12-01 │ 1000  │ {"likes": 50, "comments": 10}           │
│ xyz      │ 2024-12-02 │ 1500  │ {"likes": 80, "comments": 15}           │
└──────────┴────────────┴───────┴─────────────────────────────────────────┘

GitHub code frequency (weekly additions as primary, deletions in dimensions):
┌──────────┬────────────┬───────┬──────────────────────┐
│ metricId │ timestamp  │ value │ dimensions           │
├──────────┼────────────┼───────┼──────────────────────┤
│ def      │ 2024-11-24 │ 1500  │ {"deletions": 800}   │
│ def      │ 2024-12-01 │ 2000  │ {"deletions": 500}   │
└──────────┴────────────┴───────┴──────────────────────┘

Chart can show both lines: additions (from value) and deletions (from dimensions.deletions)
```

#### MetricTransformer (Raw API → DataPoints)

**One per template. Shared across ALL orgs.**

```prisma
model MetricTransformer {
  id          String @id @default(cuid())
  templateId  String @unique  // "github-repo-stars", "youtube-video-stats"

  // Endpoint configuration
  historicalEndpoint String?   // Endpoint for fetching historical data
  historicalMethod   String?   // "GET" or "POST" for historical
  historicalBody     Json?     // Request body for historical POST endpoints

  pollingEndpoint    String?   // Endpoint for incremental updates
  pollingMethod      String?   // "GET" or "POST" for polling
  pollingBody        Json?     // Request body for polling POST endpoints

  // Transformation code (TypeScript)
  // If endpoints return same structure: only transformerCode is used
  // If endpoints return different structures: use historicalTransformerCode for historical
  transformerCode            String  @db.Text   // Primary transformer (used for polling, and historical if same structure)
  historicalTransformerCode  String? @db.Text   // Only if historical endpoint returns different structure

  // Documentation (for AI regeneration, debugging)
  inputExample   Json?   // Example API response (used to generate this transformer)
  outputExample  Json?   // Example transformed output

  // Versioning & Status
  version      Int    @default(1)
  status       String @default("active")  // "active", "deprecated", "failed"
  failureCount Int    @default(0)         // Increment on failure, reset on success

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([templateId])
  @@index([status])
}
```

**Design Decisions:**

- **One per template**: `github-repo-stars` has ONE transformer, used by ALL orgs
- **Two transformer code options**:
  - If historical and polling endpoints return **same structure**: only `transformerCode` is used for both
  - If endpoints return **different structures**: `historicalTransformerCode` is used for historical fetch, `transformerCode` for polling
- **TypeScript only**: All transformer code is TypeScript for type safety
- **Input example stored**: The actual API response used to generate this transformer (helps with debugging/regeneration)
- **Failure tracking**: `failureCount` increments on errors, triggers regeneration at threshold

#### ChartTransformer (DataPoints → ChartConfig)

**One per DashboardMetric. User-specific.**

```prisma
model ChartTransformer {
  id                String @id @default(cuid())
  dashboardMetricId String @unique
  dashboardMetric   DashboardMetric @relation(fields: [dashboardMetricId], references: [id], onDelete: Cascade)

  // Transformation code (TypeScript)
  transformerCode String @db.Text  // Code: DataPoint[] → ChartConfig

  // User preferences that influenced generation
  chartType    String    // "line", "bar", "area", "pie", etc.
  dateRange    String?   // "7d", "30d", "90d", "all"
  aggregation  String?   // "sum", "avg", "max", "none"
  preferences  Json?     // Additional preferences

  // Generation context
  userPrompt   String?   // User's natural language request

  version   Int @default(1)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([dashboardMetricId])
}
```

**Design Decisions:**

- **Per DashboardMetric**: Each user's visualization is independent (two users in same org can have different charts for same metric)
- **TypeScript only**: All transformer code is TypeScript
- **User preferences stored**: Know what generated this code
- **User prompt stored**: Can regenerate with same/modified prompt
- **Cascade delete**: When DashboardMetric deleted, transformer deleted

---

## Transformer Code Structure

All transformer code is **TypeScript**.

### MetricTransformer Code (API → DataPoints)

AI generates TypeScript that transforms API response to DataPoints:

```typescript
// Example: github-repo-stars transformer
function transform(
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): DataPoint[] {
  const data = apiResponse as { stargazers_count: number };

  return [
    {
      timestamp: new Date(),
      value: data.stargazers_count,
      dimensions: null,
    },
  ];
}
```

```typescript
// Example: youtube-video-stats transformer
function transform(
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): DataPoint[] {
  const data = apiResponse as { items: Array<{ statistics: any }> };
  const stats = data.items[0]?.statistics;

  if (!stats) return [];

  return [
    {
      timestamp: new Date(),
      value: parseInt(stats.viewCount) || 0,
      dimensions: {
        likes: parseInt(stats.likeCount) || 0,
        comments: parseInt(stats.commentCount) || 0,
        favorites: parseInt(stats.favoriteCount) || 0,
      },
    },
  ];
}
```

```typescript
// Example: github-code-frequency transformer (additions + deletions)
function transform(
  apiResponse: unknown,
  endpointConfig: Record<string, string>,
): DataPoint[] {
  // API returns: [[timestamp, additions, deletions], ...]
  const data = apiResponse as Array<[number, number, number]>;

  return data.map(([timestamp, additions, deletions]) => ({
    timestamp: new Date(timestamp * 1000),
    value: additions,
    dimensions: { deletions: Math.abs(deletions) },
  }));
}
```

### ChartTransformer Code (DataPoints → ChartConfig)

AI generates TypeScript that transforms DataPoints to Recharts config:

```typescript
// Example: Line chart for last 30 days
function transform(
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ChartConfig {
  // Filter to date range
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  const filtered = dataPoints.filter((dp) => new Date(dp.timestamp) >= cutoff);

  // Sort chronologically
  const sorted = filtered.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  // Format for Recharts
  const chartData = sorted.map((dp) => ({
    date: new Date(dp.timestamp).toISOString().split("T")[0],
    value: dp.value,
  }));

  return {
    chartType: "line",
    chartData,
    chartConfig: {
      value: { label: "Value", color: "var(--chart-1)" },
    },
    xAxisKey: "date",
    dataKeys: ["value"],
    title: "Trend (Last 30 Days)",
    xAxisLabel: "Date",
    yAxisLabel: "Count",
    showLegend: false,
    showTooltip: true,
  };
}
```

```typescript
// Example: Multi-line chart using dimensions (additions + deletions)
function transform(
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
): ChartConfig {
  const sorted = dataPoints.sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  const chartData = sorted.map((dp) => ({
    date: new Date(dp.timestamp).toISOString().split("T")[0],
    additions: dp.value,
    deletions: dp.dimensions?.deletions ?? 0,
  }));

  return {
    chartType: "line",
    chartData,
    chartConfig: {
      additions: { label: "Additions", color: "var(--chart-2)" },
      deletions: { label: "Deletions", color: "var(--chart-1)" },
    },
    xAxisKey: "date",
    dataKeys: ["additions", "deletions"],
    title: "Code Changes",
    showLegend: true,
    showTooltip: true,
  };
}
```

---

## Transformer Generation Flow

### MetricTransformer Generation (First time a template is used)

```
1. User creates metric with template "github-repo-stars"

2. Check: Does MetricTransformer exist for "github-repo-stars"?
   └── NO: Generate new transformer

3. Fetch sample data from API
   └── GET /repos/facebook/react
   └── Response: { stargazers_count: 215000, forks_count: 44000, ... }

4. Pass to AI:
   ├── Template definition (what this metric tracks)
   ├── Actual API response (real data structure)
   ├── DataPoint schema (target output)
   └── Instructions for TypeScript generation

5. AI generates TypeScript transformer function

6. Save to MetricTransformer:
   ├── templateId: "github-repo-stars"
   ├── transformerCode: <generated TypeScript>
   ├── inputExample: <the API response used>
   └── status: "active"

7. Use transformer to process historical data
```

**Key Point**: We pass the ACTUAL fetched API response to AI, so it generates code based on real data structure, not documentation.

### Transformer Code: Same vs Different Endpoints

**Case 1: Same endpoint structure (use single transformer)**

When historical and polling endpoints return the same structure (just different time windows), we use the same `transformerCode`:

```
Template: github-repo-stars
├── historicalEndpoint: "/repos/{OWNER}/{REPO}"
├── pollingEndpoint: "/repos/{OWNER}/{REPO}"
├── transformerCode: <used for both>
└── historicalTransformerCode: null (not needed)

Template: posthog-events-total
├── historicalEndpoint: "/api/projects/{PROJECT}/query" (body: {date_from: "-90d"})
├── pollingEndpoint: "/api/projects/{PROJECT}/query" (body: {date_from: "-1d"})
├── transformerCode: <used for both - response structure identical>
└── historicalTransformerCode: null (not needed)
```

**Case 2: Different endpoint structures (use two transformers)**

When historical and polling endpoints return different structures, we generate two separate transformers:

```
Template: github-commit-activity
├── historicalEndpoint: "/repos/{OWNER}/{REPO}/stats/commit_activity"
│   └── Returns: [[week_timestamp, additions, deletions], ...]
├── pollingEndpoint: "/repos/{OWNER}/{REPO}/commits?per_page=1"
│   └── Returns: {sha: "...", commit: {message: "..."}, ...}
├── transformerCode: <for polling - transforms single commit>
└── historicalTransformerCode: <for historical - transforms stats array>
```

**Logic in code:**

```typescript
// When fetching historical data:
const code = transformer.historicalTransformerCode ?? transformer.transformerCode;

// When polling:
const code = transformer.transformerCode;
```

---

## Transformer Execution Security

### Controlled Execution Context

Transformers receive ONLY the data they need. No database access, no network access.

```typescript
async function executeChartTransformer(dashboardMetric: DashboardMetric) {
  const transformer = await db.chartTransformer.findUnique({
    where: { dashboardMetricId: dashboardMetric.id },
  });

  if (!transformer) return;

  // 1. WE query the data (transformer never touches DB)
  const dataPoints = await db.metricDataPoint.findMany({
    where: { metricId: dashboardMetric.metricId },
    orderBy: { timestamp: "desc" },
    take: 1000,
  });

  // 2. WE build preferences object
  const preferences = {
    chartType: transformer.chartType,
    dateRange: transformer.dateRange,
    aggregation: transformer.aggregation,
  };

  // 3. Execute with ONLY this data
  const chartConfig = runTransformerCode(
    transformer.transformerCode,
    dataPoints,
    preferences,
  );

  // 4. Validate output matches ChartConfig schema
  const validated = validateChartConfig(chartConfig);

  // 5. Save to DashboardMetric
  await db.dashboardMetric.update({
    where: { id: dashboardMetric.id },
    data: { graphConfig: validated },
  });
}
```

**Security guarantees:**

- Transformer code receives serialized data, not live DB connection
- Only receives data for its own metric (org isolation automatic)
- Output validated before saving
- No network/filesystem access in execution context

---

## Transformer Failure Handling

When a transformer fails repeatedly:

```
Failure 1:
  └── Log error to Metric.lastError
  └── Continue polling (next scheduled time)

Failure 2:
  └── Log error
  └── Increment MetricTransformer.failureCount
  └── Continue polling

Failure 3 (threshold reached):
  └── Trigger AI regeneration
  └── Fetch fresh sample data from API
  └── Generate new transformer with AI
  └── Increment version, reset failureCount
  └── If regeneration succeeds: resume polling
  └── If regeneration fails: mark status = "failed", alert user
```

**Retry with increasing gaps:**

| Attempt | Wait Time | Action                         |
| ------- | --------- | ------------------------------ |
| 1       | 0         | Try existing transformer       |
| 2       | 1 hour    | Try existing transformer again |
| 3       | 6 hours   | Try existing transformer again |
| 4       | -         | Trigger AI regeneration        |

---

## Polling Infrastructure

### Vercel Cron Jobs

Using Vercel Cron for scheduled polling.

#### Cron Configuration (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-metrics",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

#### Poll Frequency Tiers

| Frequency  | Cron Schedule           | Use Cases                              |
| ---------- | ----------------------- | -------------------------------------- |
| `frequent` | Every 15 min            | Real-time dashboards, active metrics   |
| `hourly`   | Every hour              | Standard metrics                       |
| `daily`    | Once per day (midnight) | Slow-changing metrics (stars, follows) |
| `weekly`   | Once per week           | Very slow metrics                      |
| `manual`   | Never auto-poll         | User triggers manually                 |

#### Rate Limiting Strategy

For now: **Manual adjustment** of poll frequencies to avoid hitting API rate limits.

Future consideration: Implement queue with backoff if needed.

#### Polling Worker Logic

```typescript
// /api/cron/poll-metrics/route.ts

export async function GET(request: Request) {
  // Verify cron secret (Vercel adds this header)
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 1. Find metrics due for polling
  const metricsDue = await db.metric.findMany({
    where: {
      nextPollAt: { lte: new Date() },
      pollFrequency: { not: "manual" },
    },
    include: {
      integration: true,
      dashboardMetrics: {
        include: { chartTransformer: true },
      },
    },
    take: 50, // Batch size per cron run
  });

  // 2. Group by integration for efficient API calls
  const byIntegration = groupBy(metricsDue, (m) => m.integrationId);

  // 3. Process each integration
  for (const [integrationId, metrics] of Object.entries(byIntegration)) {
    await processMetricsBatch(integrationId, metrics);
  }

  return Response.json({ processed: metricsDue.length });
}

async function processMetricsBatch(integrationId: string, metrics: Metric[]) {
  for (const metric of metrics) {
    try {
      // a. Get transformer
      const transformer = await db.metricTransformer.findUnique({
        where: { templateId: metric.metricTemplate },
      });

      if (!transformer || transformer.status !== "active") {
        throw new Error(`No active transformer for ${metric.metricTemplate}`);
      }

      // b. Fetch data via Nango
      const rawData = await fetchIntegrationData(
        metric.integration!,
        transformer.pollingEndpoint,
        transformer.method,
        metric.endpointConfig,
      );

      // c. Transform to DataPoints
      const dataPoints = runTransformerCode(
        transformer.transformerCode,
        rawData,
        metric.endpointConfig,
      );

      // d. Upsert DataPoints
      await upsertDataPoints(metric.id, dataPoints);

      // e. Update chart configs for all DashboardMetrics
      for (const dm of metric.dashboardMetrics) {
        await executeChartTransformer(dm);
      }

      // f. Update metric timestamps, reset failure count
      await db.metric.update({
        where: { id: metric.id },
        data: {
          lastFetchedAt: new Date(),
          nextPollAt: calculateNextPoll(metric.pollFrequency),
          lastError: null,
        },
      });

      // g. Reset transformer failure count on success
      await db.metricTransformer.update({
        where: { templateId: metric.metricTemplate },
        data: { failureCount: 0 },
      });
    } catch (error) {
      // Log error, don't stop batch
      await db.metric.update({
        where: { id: metric.id },
        data: {
          lastError: error.message,
          nextPollAt: calculateNextPoll(metric.pollFrequency),
        },
      });

      // Increment transformer failure count
      await handleTransformerFailure(metric.metricTemplate, error);
    }
  }
}
```

---

## Historical Data Limits

**Defined per MetricTemplate** in the template configuration:

```typescript
// In src/lib/integrations/github.ts
export const githubTemplates: MetricTemplate[] = [
  {
    templateId: "github-repo-stars",
    // ... other fields ...
    historicalDataLimit: "90d", // Fetch last 90 days on creation
  },
  {
    templateId: "github-code-frequency",
    historicalDataLimit: "365d", // Fetch last year
  },
];
```

| Template Type    | Suggested Limit | Rationale                              |
| ---------------- | --------------- | -------------------------------------- |
| Fast-changing    | 30d             | Don't need old data, API might be slow |
| Standard metrics | 90d             | Good balance                           |
| Slow-changing    | 365d            | Stars/followers change slowly          |
| Expensive APIs   | 30d             | Minimize API calls                     |

---

## AI Prompt Strategy

### MetricTransformer Generation

Called ONCE per template (when first metric of that type is created).

**System Prompt:**

```
You are a TypeScript code generator that creates data transformation functions.

Given:
- An API endpoint and its ACTUAL response (real data, not documentation)
- The target DataPoint schema

Generate a TypeScript function that transforms the API response into DataPoint objects.

DataPoint schema:
{
  timestamp: Date,           // When this data point occurred
  value: number,             // Primary numeric value (always required)
  dimensions: object | null, // Additional related values (optional)
}

Rules:
1. The function signature must be:
   function transform(apiResponse: unknown, endpointConfig: Record<string, string>): DataPoint[]
2. Return an array of DataPoint objects
3. Handle missing/null values gracefully (use || 0 for numbers)
4. Parse date strings into Date objects
5. Convert string numbers to actual numbers with parseInt/parseFloat
6. Put the PRIMARY metric value in 'value' field
7. Put RELATED values in 'dimensions' object (e.g., {likes: 50, deletions: 200})
8. Use TypeScript type assertions for the API response
9. Always return an array, even for single values
```

**User Prompt:**

```
Template: github-repo-stars
Integration: github
Endpoint: GET /repos/{OWNER}/{REPO}

ACTUAL API Response (fetched just now):
{
  "id": 10270250,
  "name": "react",
  "full_name": "facebook/react",
  "stargazers_count": 215432,
  "forks_count": 44123,
  "watchers_count": 6543,
  "open_issues_count": 1234,
  "updated_at": "2024-12-05T10:30:00Z"
}

This template tracks: Repository star count

Parameters available in endpointConfig: OWNER, REPO

Generate the TypeScript transform function.
```

### ChartTransformer Generation

Called per DashboardMetric (when user creates metric or requests chart change).

**System Prompt:**

```
You are a TypeScript code generator for Recharts chart configurations.

Given:
- DataPoint array with timestamp, value, and optional dimensions
- User preferences (chartType, dateRange, aggregation)

Generate a TypeScript function that transforms DataPoints into a Recharts-compatible config.

DataPoint schema:
{
  timestamp: Date,
  value: number,
  dimensions: object | null  // e.g., {likes: 50, deletions: 200}
}

ChartConfig schema:
{
  chartType: "line" | "bar" | "area" | "pie" | "radar" | "radial" | "kpi",
  chartData: Array<Record<string, any>>,
  chartConfig: Record<string, { label: string, color: string }>,
  xAxisKey: string,
  dataKeys: string[],
  title: string,
  description?: string,
  xAxisLabel?: string,
  yAxisLabel?: string,
  showLegend?: boolean,
  showTooltip?: boolean,
  stacked?: boolean,
}

Rules:
1. Function signature: function transform(dataPoints: DataPoint[], preferences: Preferences): ChartConfig
2. Apply dateRange filter (7d, 30d, 90d, all)
3. Apply aggregation if specified (sum, avg, max per day/week/month)
4. Sort chronologically for time-series charts
5. Use var(--chart-1) through var(--chart-12) for colors
6. Format dates as readable strings for chart labels
7. If dimensions exist and user wants multi-line chart, extract from dimensions
8. Always return a valid ChartConfig object
```

**User Prompt (Auto-generated on metric creation):**

```
DataPoint sample (first 5):
[
  {"timestamp": "2024-12-01T00:00:00Z", "value": 14500, "dimensions": null},
  {"timestamp": "2024-12-02T00:00:00Z", "value": 14650, "dimensions": null},
  {"timestamp": "2024-12-03T00:00:00Z", "value": 14800, "dimensions": null},
  {"timestamp": "2024-12-04T00:00:00Z", "value": 14900, "dimensions": null},
  {"timestamp": "2024-12-05T00:00:00Z", "value": 15000, "dimensions": null}
]

Preferences:
- chartType: line
- dateRange: 30d
- aggregation: none

Metric name: GitHub Stars
Metric description: Repository star count over time

Generate the TypeScript transform function.
```

**User Prompt (User-requested change):**

```
Current chart shows daily values as a line chart.

User request: "Show weekly averages as a bar chart instead"

DataPoint sample (first 10):
[...]

Generate updated TypeScript transform function.
```

---

## Implementation Phases

### Phase 1: Database Schema

- [ ] Add MetricDataPoint table
- [ ] Add MetricTransformer table
- [ ] Add ChartTransformer table
- [ ] Add polling fields to Metric model (pollFrequency, nextPollAt, lastFetchedAt, lastError)
- [ ] Add chartTransformerId to DashboardMetric
- [ ] Add historicalDataLimit to MetricTemplate type
- [ ] Run migrations

### Phase 2: MetricTransformer System

- [ ] Create AI prompt for transformer generation (TypeScript)
- [ ] Build transformer execution engine (controlled context)
- [ ] Implement: fetch sample data → pass to AI → generate transformer
- [ ] Update metric creation flow to check/create transformer
- [ ] Add historical data fetch on metric creation
- [ ] Test with GitHub, YouTube, PostHog templates

### Phase 3: ChartTransformer System

- [ ] Create AI prompt for chart transformer generation (TypeScript)
- [ ] Build chart transformer execution engine
- [ ] Update metric creation to generate initial chart
- [ ] Add UI for user to request chart changes (natural language)
- [ ] Test regeneration with user prompts

### Phase 4: Polling Infrastructure

- [ ] Set up Vercel Cron job (/api/cron/poll-metrics)
- [ ] Build polling worker logic
- [ ] Implement transformer failure handling (3 retries → AI regeneration)
- [ ] Add poll frequency selection to metric creation UI
- [ ] Add manual refresh button (for manual frequency)
- [ ] Test with multiple frequencies

### Phase 5: Dashboard Updates

- [ ] Update dashboard to use new graphConfig flow
- [ ] Add "last updated" indicator (from lastFetchedAt)
- [ ] Add error state display (when lastError is set)
- [ ] Test performance with many metrics

### Phase 6: Cleanup & Migration

- [ ] Migrate existing metrics to new system
- [ ] Generate transformers for existing templates
- [ ] Backfill historical data where possible
- [ ] Remove old AI transformation code paths

---

## Decisions Summary

| Decision                | Choice                                                    | Rationale                                                            |
| ----------------------- | --------------------------------------------------------- | -------------------------------------------------------------------- |
| Time-series storage     | Single MetricDataPoint table                              | No schema explosion, easy cross-metric queries                       |
| Data columns            | `value` + `dimensions` only                               | Simple: primary value always filled, dimensions optional             |
| Transformer language    | TypeScript                                                | Type safety, familiar to team                                        |
| Transformer generation  | Pass real API response to AI                              | AI sees actual data structure, not documentation                     |
| Historical/polling code | Same transformer if same structure, separate if different | Single code when possible, two codes when endpoint structures differ |
| MetricTransformer scope | Per template, shared across orgs                          | AI called once, reused everywhere                                    |
| ChartTransformer scope  | Per DashboardMetric                                       | Each user's visualization is independent                             |
| Transformer execution   | Controlled context                                        | Secure: no DB/network access, only receives serialized data          |
| Transformer failure     | 3 retries then AI regeneration                            | Self-healing with increasing gaps                                    |
| Polling infrastructure  | Vercel Cron                                               | Simple, serverless, scales with Vercel                               |
| Historical data limits  | Per template configuration                                | Different templates have different needs                             |
| Rate limiting           | Manual adjustment for now                                 | Simple, can add queue later if needed                                |
| Data retention          | No auto-deletion for now                                  | Address later when needed                                            |

---

## Template Configuration

Templates remain in code (`src/lib/integrations/*.ts`) as source of truth.

**Why Import Templates (Not Copy to DB):**

- Single source of truth in version control
- Template updates don't require DB migrations
- Endpoint configuration stays with integration code
- Easier debugging and testing

**New Template Fields:**

| Field                | Type    | Description                      |
| -------------------- | ------- | -------------------------------- |
| historicalDataLimit  | string  | "30d", "90d", "365d" - backfill  |
| defaultPollFrequency | string  | Default polling tier             |
| isTimeSeries         | boolean | false for snapshot data (Sheets) |

**MetricTransformer References Template:**

```typescript
// When creating MetricTransformer
const template = getTemplateById(templateId);
const transformer = await db.metricTransformer.create({
  data: {
    templateId: template.templateId,
    // Endpoints from template
    historicalEndpoint: template.metricEndpoint,
    pollingEndpoint: template.metricEndpoint,
    // AI-generated code
    transformerCode: generatedCode,
  },
});
```

---

## Non-Time-Series Metrics (Google Sheets)

Google Sheets returns snapshot data, not time-series.

**Behavior:**

| Aspect     | Time-Series (GitHub, etc.) | Snapshot (Sheets)     |
| ---------- | -------------------------- | --------------------- |
| Historical | Fetch N days of data       | Skip (no history)     |
| Polling    | Accumulate new data points | Replace existing data |
| Storage    | Multiple DataPoints        | Single DataPoint      |
| value      | Metric value               | Item count            |
| dimensions | Related metrics            | Full snapshot data    |

**Template Flag:**

```typescript
{
  templateId: "google-sheets-column-data",
  isTimeSeries: false,  // Triggers snapshot behavior
}
```

**Polling Logic:**

```typescript
if (template.isTimeSeries) {
  // Upsert: add new data point, keep history
  await upsertDataPoints(metricId, newDataPoints);
} else {
  // Replace: delete old, insert new
  await db.metricDataPoint.deleteMany({ where: { metricId } });
  await db.metricDataPoint.createMany({ data: newDataPoints });
}
```

---

## File Structure (Post-Refactor)

```
src/
├── app/
│   ├── api/
│   │   └── cron/
│   │       └── poll-metrics/
│   │           └── route.ts            # Cron job for polling metrics
│   └── metric/
│       └── _components/
│           ├── base/
│           │   ├── MetricDialogBase.tsx
│           │   ├── MetricTabsDisplay.tsx
│           │   └── index.ts
│           ├── github/
│           │   ├── GitHubMetricContent.tsx
│           │   ├── GitHubMetricDialog.tsx
│           │   └── index.ts
│           ├── youtube/
│           │   ├── YouTubeMetricContent.tsx
│           │   ├── YouTubeMetricDialog.tsx
│           │   └── index.ts
│           ├── posthog/
│           │   ├── PostHogMetricContent.tsx
│           │   ├── PostHogMetricDialog.tsx
│           │   └── index.ts
│           ├── google-sheets/
│           │   ├── GoogleSheetsMetricContent.tsx
│           │   ├── GoogleSheetsMetricDialog.tsx
│           │   └── index.ts
│           └── index.ts                # Re-exports from folders
├── lib/
│   ├── integrations/
│   │   ├── github.ts                   # Templates with new fields
│   │   ├── youtube.ts
│   │   ├── posthog.ts
│   │   └── google-sheets.ts
│   └── metrics/
│       ├── types.ts                    # MetricTemplate with new fields
│       ├── transformer-types.ts        # DataPoint, ChartConfig, etc.
│       ├── utils.ts                    # Shared utilities
│       └── index.ts
└── server/
    └── api/
        ├── routers/
        │   ├── dashboard.ts            # Chart updates
        │   ├── metric.ts               # Metric CRUD
        │   └── transformer.ts          # Transformer CRUD (new)
        └── services/
            ├── data-fetching/
            │   ├── nango.ts            # Nango API fetcher
            │   └── index.ts
            ├── transformation/
            │   ├── ai-generator.ts     # AI code generation (TODO)
            │   ├── executor.ts         # Safe code execution (TODO)
            │   ├── metric-transformer.ts  # MetricTransformer logic (TODO)
            │   ├── chart-transformer.ts   # ChartTransformer logic (TODO)
            │   ├── types.ts            # Chart types
            │   └── index.ts
            └── index.ts
```
