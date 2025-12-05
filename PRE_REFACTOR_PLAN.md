# Pre-Refactor Plan

This plan prepares the repository for the new metrics architecture. Execute all tasks in order before starting METRICS_ARCHITECTURE_PLAN.md implementation.

---

## Overview

**Goal:** Reorganize codebase structure, delete deprecated code, and create placeholder files so the main architecture implementation can proceed smoothly.

**Scope:**

- ✅ Frontend folder restructuring
- ✅ Backend service consolidation
- ✅ Shared utilities extraction
- ✅ Template configuration updates
- ✅ Delete deprecated code
- ✅ Create empty architecture files
- ✅ Update METRICS_ARCHITECTURE_PLAN.md

**Out of Scope:**

- Migration strategy (fresh start, no data migration)
- Manual metrics (ignore for now)
- Google Sheets time-series (handled as snapshot replacement)

---

## Task 1: Restructure Frontend Metrics into Folders

**Current Structure (flat files):**

```
src/app/metric/_components/
├── GitHubMetricContent.tsx
├── GitHubMetricDialog.tsx
├── GoogleSheetsMetricContent.tsx
├── GoogleSheetsMetricDialog.tsx
├── MetricDialogBase.tsx
├── MetricTabsDisplay.tsx
├── PostHogMetricContent.tsx
├── PostHogMetricDialog.tsx
├── YouTubeMetricContent.tsx
├── YouTubeMetricDialog.tsx
└── index.ts
```

**New Structure (folders per integration):**

```
src/app/metric/_components/
├── base/
│   ├── MetricDialogBase.tsx      # MOVE from root
│   ├── MetricTabsDisplay.tsx     # MOVE from root
│   └── index.ts                  # NEW - barrel export
├── github/
│   ├── GitHubMetricContent.tsx   # MOVE from root
│   ├── GitHubMetricDialog.tsx    # MOVE from root
│   └── index.ts                  # NEW - barrel export
├── youtube/
│   ├── YouTubeMetricContent.tsx  # MOVE from root
│   ├── YouTubeMetricDialog.tsx   # MOVE from root
│   └── index.ts                  # NEW - barrel export
├── posthog/
│   ├── PostHogMetricContent.tsx  # MOVE from root
│   ├── PostHogMetricDialog.tsx   # MOVE from root
│   └── index.ts                  # NEW - barrel export
├── google-sheets/
│   ├── GoogleSheetsMetricContent.tsx  # MOVE from root
│   ├── GoogleSheetsMetricDialog.tsx   # MOVE from root
│   └── index.ts                       # NEW - barrel export
└── index.ts                      # UPDATE - re-export from folders
```

**Steps:**

1. Create folder structure: `base/`, `github/`, `youtube/`, `posthog/`, `google-sheets/`
2. Move files to appropriate folders
3. Create barrel exports (`index.ts`) in each folder
4. Update root `index.ts` to re-export from folders
5. Update all imports across codebase

---

## Task 2: Consolidate Backend Services

**Current Structure:**

```
src/server/api/services/
├── nango.ts
└── chart-tools/
    ├── ai-transformer.ts
    └── types.ts
```

**New Structure:**

```
src/server/api/services/
├── data-fetching/
│   ├── nango.ts                  # MOVE from root
│   └── index.ts                  # NEW - barrel export
├── transformation/
│   ├── ai-generator.ts           # NEW (empty) - generates transformer code with AI
│   ├── executor.ts               # NEW (empty) - executes saved transformer code
│   ├── metric-transformer.ts     # NEW (empty) - MetricTransformer business logic
│   ├── chart-transformer.ts      # NEW (empty) - ChartTransformer business logic
│   ├── types.ts                  # MOVE from chart-tools/types.ts + extend
│   └── index.ts                  # NEW - barrel export
└── index.ts                      # NEW - root barrel export
```

**Files to Delete:**

- `src/server/api/services/chart-tools/ai-transformer.ts` - Will be replaced by `ai-generator.ts`
- `src/server/api/services/chart-tools/` folder - Consolidate into `transformation/`

**Steps:**

1. Create `data-fetching/` folder, move `nango.ts`
2. Create `transformation/` folder
3. Move and rename `chart-tools/types.ts` → `transformation/types.ts`
4. Create empty placeholder files for new architecture
5. Delete `chart-tools/` folder and `ai-transformer.ts`
6. Create barrel exports
7. Update all imports

---

## Task 3: Extract Shared Utilities

**Create:** `src/lib/metrics/utils.ts`

Extract from `nango.ts`:

```typescript
// Date utilities
export function getDateString(daysAgo: number): string;
export function getDateFromPlaceholder(placeholder: string): string;

// Parameter substitution
export function substituteParams(
  template: string,
  params: Record<string, string>,
): string;
```

Extract from `ai-transformer.ts` (before deletion):

```typescript
// Chart constants
export const CHART_TYPES = [
  "line",
  "bar",
  "area",
  "pie",
  "radar",
  "radial",
  "kpi",
] as const;

export type ChartType = (typeof CHART_TYPES)[number];

// Color palette
export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  // ... through var(--chart-12)
] as const;
```

**Create:** `src/lib/metrics/transformer-types.ts`

```typescript
// Types for AI-generated transformer code
export interface DataPoint {
  timestamp: Date;
  value: number;
  dimensions: Record<string, unknown> | null;
}

export interface TransformContext {
  endpointConfig: Record<string, string>;
}

export interface ChartConfig {
  chartType: string;
  chartData: Record<string, unknown>[];
  chartConfig: Record<string, { label: string; color: string }>;
  xAxisKey: string;
  dataKeys: string[];
  title?: string;
  description?: string;
  xAxisLabel?: string;
  yAxisLabel?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  stacked?: boolean;
}

// Function signatures that AI must generate
export type MetricTransformFn = (
  apiResponse: unknown,
  context: TransformContext,
) => DataPoint[];

export type ChartTransformFn = (
  dataPoints: DataPoint[],
  preferences: { chartType: string; dateRange: string; aggregation: string },
) => ChartConfig;
```

**Steps:**

1. Create `src/lib/metrics/utils.ts` with extracted utilities
2. Create `src/lib/metrics/transformer-types.ts` with type definitions
3. Update `src/lib/metrics/index.ts` to export new modules
4. Update `nango.ts` to import from utils (remove duplicate code)

---

## Task 4: Update Template Configuration

**Why Import Templates Instead of Copying Values:**

Templates are defined in code (`src/lib/integrations/*.ts`) and should remain the source of truth. When creating a `MetricTransformer`, we:

1. **Import** the template definition (endpoints, params, etc.)
2. **Reference** the templateId to look up configuration at runtime
3. **Generate** only the transformer code (the AI-generated part)

This approach:

- Avoids data duplication between code and database
- Allows template updates without database migrations
- Keeps endpoint configuration in version control
- Makes debugging easier (single source of truth)

**Add New Fields to Templates:**

Update each integration file to add:

```typescript
// src/lib/integrations/github.ts
export const templates: MetricTemplate[] = [
  {
    templateId: "github-repo-stars",
    // ... existing fields ...

    // NEW FIELDS
    historicalDataLimit: "90d", // How far back to fetch on creation
    defaultPollFrequency: "daily", // Default polling frequency
    isTimeSeries: true, // true for time-series, false for snapshots
  },
];
```

**Template Type Update:**

```typescript
// src/lib/metrics/types.ts
export interface MetricTemplate {
  // ... existing fields ...

  // NEW FIELDS
  historicalDataLimit?: string; // "30d", "90d", "365d"
  defaultPollFrequency?: "frequent" | "hourly" | "daily" | "weekly" | "manual";
  isTimeSeries?: boolean; // default true
}
```

**Integration-Specific Defaults:**

| Integration   | historicalDataLimit | defaultPollFrequency | isTimeSeries |
| ------------- | ------------------- | -------------------- | ------------ |
| GitHub        | 90d                 | daily                | true         |
| YouTube       | 28d                 | daily                | true         |
| PostHog       | 90d                 | hourly               | true         |
| Google Sheets | N/A                 | daily                | false        |

**Steps:**

1. Update `src/lib/metrics/types.ts` with new fields
2. Update each integration file with new field values
3. Verify TypeScript compiles without errors

---

## Task 5: Google Sheets Handling (Snapshot Replacement)

Google Sheets is **not time-series data**. Each poll replaces the previous data.

**How It Works:**

1. **Poll on Schedule:** Same as other integrations (daily by default)
2. **Replace Data:** Each fetch creates ONE MetricDataPoint with current timestamp
3. **No Historical Accumulation:** Upsert replaces existing data for same metric
4. **Store in Dimensions:** Column data stored in `dimensions` field

**MetricTransformer for Google Sheets:**

```typescript
// Generated transformer for google-sheets-column-data
function transform(
  apiResponse: unknown,
  context: TransformContext,
): DataPoint[] {
  const data = apiResponse as { values: string[][] };
  const columnData = data.values?.map((row) => row[0]) || [];

  return [
    {
      timestamp: new Date(),
      value: columnData.length, // Count as primary value
      dimensions: {
        items: columnData, // Actual column data
        spreadsheetId: context.endpointConfig.SPREADSHEET_ID,
        sheetName: context.endpointConfig.SHEET_NAME,
        columnIndex: context.endpointConfig.COLUMN_INDEX,
      },
    },
  ];
}
```

**ChartTransformer for Google Sheets:**

```typescript
// Can create pie chart from item counts, or KPI showing total
function transform(dataPoints: DataPoint[], preferences): ChartConfig {
  const latest = dataPoints[0];
  const items = (latest?.dimensions?.items as string[]) || [];

  if (preferences.chartType === "kpi") {
    return {
      chartType: "kpi",
      chartData: [{ value: items.length }],
      // ...
    };
  }

  // Count occurrences for pie/bar chart
  const counts = items.reduce(
    (acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return {
    chartType: preferences.chartType || "pie",
    chartData: Object.entries(counts).map(([name, value]) => ({ name, value })),
    // ...
  };
}
```

**Database Behavior:**

- `@@unique([metricId, timestamp])` constraint
- For Sheets: Always upsert with `new Date()` → replaces previous day's data
- If user wants history: could use different timestamp (start of day) to keep daily snapshots

**No Changes Needed to Architecture:**

The existing MetricDataPoint schema handles this. The `isTimeSeries: false` flag in template tells the system to:

1. Skip historical data fetch on creation
2. Replace (not accumulate) on each poll

---

## Task 6: Delete Deprecated Code

**Frontend - Delete:**

These files will be replaced by the new architecture flow:

```
# AI transformation call in metric creation (will use saved transformers)
- Remove AI call from MetricDialogBase.tsx generateChartData() function
  (Keep the function, remove the AI transformation part)
```

**Backend - Delete:**

```
# tRPC procedures to remove
src/server/api/routers/dashboard.ts:
  - Delete: transformChartWithAI procedure
    (Replaced by ChartTransformer execution)

# Services to delete
src/server/api/services/chart-tools/
  - Delete entire folder (ai-transformer.ts, types.ts)
    (Replaced by transformation/ folder)
```

**Steps:**

1. Remove `transformChartWithAI` procedure from `dashboard.ts` router
2. Delete `chart-tools/` folder
3. Update `MetricDialogBase.tsx` to remove direct AI transformation call
4. Verify no broken imports

---

## Task 7: Create Empty Architecture Files

Create placeholder files for the new architecture with TODO comments:

**API Route:**

```
src/app/api/cron/poll-metrics/route.ts  # NEW (empty)
```

**tRPC Router:**

```
src/server/api/routers/transformer.ts   # NEW (empty)
```

**Services:**

```
src/server/api/services/transformation/
├── ai-generator.ts           # NEW (empty) - AI generates transformer code
├── executor.ts               # NEW (empty) - Executes saved transformer code safely
├── metric-transformer.ts     # NEW (empty) - MetricTransformer CRUD & execution
├── chart-transformer.ts      # NEW (empty) - ChartTransformer CRUD & execution
├── types.ts                  # Contains transformation types
└── index.ts                  # Barrel export
```

**Empty File Template:**

```typescript
/**
 * TODO: Implement as part of METRICS_ARCHITECTURE_PLAN.md
 *
 * This file will handle: [description]
 *
 * See METRICS_ARCHITECTURE_PLAN.md for:
 * - Schema details
 * - Implementation flow
 * - Security considerations
 */

export {};
```

**Steps:**

1. Create `src/app/api/cron/poll-metrics/route.ts` with TODO
2. Create `src/server/api/routers/transformer.ts` with TODO
3. Create transformation service files with TODOs
4. Verify project still builds

---

## Task 8: Update METRICS_ARCHITECTURE_PLAN.md

Add the following sections to the architecture plan:

### 8.1 Add: Template Configuration Section

```markdown
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

\`\`\`typescript
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
\`\`\`
```

### 8.2 Add: Non-Time-Series Handling Section

```markdown
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

\`\`\`typescript
{
templateId: "google-sheets-column-data",
isTimeSeries: false, // Triggers snapshot behavior
}
\`\`\`

**Polling Logic:**

\`\`\`typescript
if (template.isTimeSeries) {
// Upsert: add new data point, keep history
await upsertDataPoints(metricId, newDataPoints);
} else {
// Replace: delete old, insert new
await db.metricDataPoint.deleteMany({ where: { metricId } });
await db.metricDataPoint.createMany({ data: newDataPoints });
}
\`\`\`
```

### 8.3 Update: File Structure Section

Add the new file structure showing where everything lives after refactor.

---

## Task 9: Commit and Push

After completing all tasks:

1. Run `pnpm lint:fix` to fix any linting issues
2. Run `pnpm typecheck` to verify no type errors
3. Use `/push` command to:
   - Stage all changes
   - Create commit with message: `refactor: prepare repo for metrics architecture`
   - Push to branch
   - Create PR

---

## Execution Checklist

```
[x] Task 1: Restructure frontend metrics into folders
    [x] Create folder structure
    [x] Move files
    [x] Create barrel exports
    [x] Update imports

[x] Task 2: Consolidate backend services
    [x] Create data-fetching/ folder
    [x] Create transformation/ folder
    [x] Move and reorganize files
    [x] Delete chart-tools/ folder

[x] Task 3: Extract shared utilities
    [x] Create utils.ts
    [x] Create transformer-types.ts
    [x] Update imports in nango.ts

[x] Task 4: Update template configuration
    [x] Add new fields to MetricTemplate type
    [x] Update GitHub templates
    [x] Update YouTube templates
    [x] Update PostHog templates
    [x] Update Google Sheets templates

[x] Task 5: Google Sheets handling
    [x] Verify isTimeSeries: false is set
    [x] Document snapshot behavior

[x] Task 6: Delete deprecated code
    [x] Remove transformChartWithAI from dashboard router
    [x] Delete chart-tools/ folder
    [x] Update MetricDialogBase (remove AI call)

[x] Task 7: Create empty architecture files
    [x] Create poll-metrics route
    [x] Create transformer router
    [x] Create transformation service files

[x] Task 8: Update METRICS_ARCHITECTURE_PLAN.md
    [x] Add Template Configuration section
    [x] Add Non-Time-Series Handling section
    [x] Update File Structure section

[x] Task 9: Commit and push
    [x] Run pnpm lint:fix
    [x] Run pnpm typecheck
    [ ] Use /push command
```

---

## Notes

- All tasks should be completed before starting METRICS_ARCHITECTURE_PLAN.md
- Empty files have TODO comments pointing to architecture plan
- No data migration needed - fresh start
- Google Sheets works with existing schema (snapshot replacement)
- Templates stay in code, MetricTransformer references them by templateId
