# Chart Transformer Improvements Plan

## Overview

Enhance AI-generated transformers to automatically handle timestamp normalization, data granularity, and chart type selection without manual configuration.

## Current Problems

1. **No timestamp normalization** - Multiple cron runs create duplicates
2. **ChartTransformer lacks context** - AI only sees 10 samples, doesn't know total count or date range
3. **No example configs in prompt** - AI might generate non-optimal configs
4. **chartType always defaults to "line"** - Even when bar/pie might be better

## Implementation Tasks

### Task 1: Update DataIngestionTransformer Prompt

**File:** `src/server/api/services/transformation/ai-code-generator.ts`

**Add to METRIC_TRANSFORMER_SYSTEM_PROMPT rules:**

```
12. TIMESTAMP NORMALIZATION (Critical for time-series):
    - Always normalize timestamps to START OF DAY (midnight UTC)
    - Use: new Date(new Date(dateString).toISOString().split('T')[0] + 'T00:00:00.000Z')
    - This prevents duplicates when data is fetched multiple times per day
    - For event data (createdAt, completedAt): normalize to the day it occurred
    - For weekly/monthly aggregated APIs: use the period's start date (e.g., Monday for weeks, 1st for months)
```

---

### Task 2: Update ChartTransformer Prompt with Examples

**File:** `src/server/api/services/transformation/ai-code-generator.ts`

**Replace CHART_TRANSFORMER_SYSTEM_PROMPT with enhanced version:**

```javascript
const CHART_TRANSFORMER_SYSTEM_PROMPT = `You are a JavaScript code generator for Recharts chart configurations.

IMPORTANT: Generate PLAIN JAVASCRIPT only. NO TypeScript syntax.

Given:
- DataPoint array with timestamp, value, and optional dimensions
- Data statistics (totalCount, dateRange, dimensionKeys)
- User preferences (chartType, dateRange, aggregation)

Generate a JavaScript function that transforms DataPoints into a Recharts-compatible config.

DataPoint schema:
{
  timestamp: Date,
  value: number,
  dimensions: object | null  // e.g., {completed: 50, open: 30, canceled: 5}
}

ChartConfig schema:
{
  chartType: "line" | "bar" | "area" | "pie" | "radar" | "radial" | "kpi",
  chartData: Array of objects,
  chartConfig: Object with keys mapping to { label: string, color: string },
  xAxisKey: string,
  dataKeys: array of strings,
  title: string,
  description: string (optional),
  xAxisLabel: string (optional),
  yAxisLabel: string (optional),
  showLegend: boolean (optional),
  showTooltip: boolean (optional),
  stacked: boolean (optional),
  centerLabel: { value: string, label: string } (optional, for pie/radial)
}

=== CHART TYPE SELECTION GUIDE ===

LINE/AREA: Best for time-series data showing trends over time
- Use when: tracking values over days/weeks/months
- Example: issues completed per day, revenue over time

BAR: Best for comparisons or time-series with few data points (<20)
- Use when: comparing categories or showing discrete time periods
- Example: monthly totals, team comparisons

PIE: Best for showing distribution/breakdown of a whole
- Use when: showing parts of 100%, category breakdown
- Example: issues by status (open/closed/canceled), browser market share
- REQUIRES: chartData items must have a 'fill' property for colors

RADAR: Best for multi-dimensional comparison
- Use when: comparing multiple attributes across categories
- Example: team skills comparison, product feature scores

RADIAL: Best for single progress/gauge metrics
- Use when: showing progress toward a goal
- Example: sprint completion %, quota progress

=== EXAMPLE CONFIGS ===

LINE/AREA (time-series):
{
  chartType: "line",
  chartData: [
    { date: "2024-01-15", value: 100, completed: 50 },
    { date: "2024-01-16", value: 120, completed: 65 }
  ],
  chartConfig: {
    value: { label: "Total Issues", color: "var(--chart-1)" },
    completed: { label: "Completed", color: "var(--chart-2)" }
  },
  xAxisKey: "date",
  dataKeys: ["value", "completed"],
  title: "Issues Over Time",
  showLegend: true,
  showTooltip: true
}

BAR (comparison):
{
  chartType: "bar",
  chartData: [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 }
  ],
  chartConfig: {
    desktop: { label: "Desktop", color: "var(--chart-1)" },
    mobile: { label: "Mobile", color: "var(--chart-2)" }
  },
  xAxisKey: "month",
  dataKeys: ["desktop", "mobile"],
  title: "Visitors by Platform",
  stacked: false
}

PIE (distribution - MUST include fill property):
{
  chartType: "pie",
  chartData: [
    { status: "Open", count: 50, fill: "var(--chart-1)" },
    { status: "Completed", count: 120, fill: "var(--chart-2)" },
    { status: "Canceled", count: 15, fill: "var(--chart-3)" }
  ],
  chartConfig: {
    Open: { label: "Open", color: "var(--chart-1)" },
    Completed: { label: "Completed", color: "var(--chart-2)" },
    Canceled: { label: "Canceled", color: "var(--chart-3)" }
  },
  xAxisKey: "status",
  dataKeys: ["count"],
  title: "Issues by Status",
  centerLabel: { value: "185", label: "Total" },
  showLegend: true
}

RADAR (multi-dimensional):
{
  chartType: "radar",
  chartData: [
    { attribute: "Speed", teamA: 80, teamB: 65 },
    { attribute: "Quality", teamA: 90, teamB: 85 }
  ],
  chartConfig: {
    teamA: { label: "Team A", color: "var(--chart-1)" },
    teamB: { label: "Team B", color: "var(--chart-2)" }
  },
  xAxisKey: "attribute",
  dataKeys: ["teamA", "teamB"],
  title: "Team Comparison"
}

=== RULES ===

1. Function signature: function transform(dataPoints, preferences) { ... }
2. NO TypeScript - no ": type" annotations, no "as Type" casts
3. Use ALL data when preferences.dateRange is "all" (no filtering)
4. Apply dateRange filter only for "7d", "30d", "90d" (filter from now)
5. Sort chronologically for time-series charts (line, area, bar with dates)
6. Use var(--chart-1) through var(--chart-12) for colors
7. Format dates as readable strings (e.g., "Jan 15" or "2024-01-15")
8. For PIE charts: ALWAYS add fill property to each data item
9. If dimensions exist, consider extracting for multi-series charts
10. Aggregate data if too many points (>50 for line, >20 for bar)
11. Always return a valid ChartConfig object

=== AGGREGATION GUIDANCE ===

Based on data volume:
- < 20 points: Show all points (no aggregation)
- 20-60 points: Consider weekly aggregation for cleaner charts
- > 60 points: Consider monthly aggregation
- For "none" aggregation preference: respect user choice, show all

Output ONLY the function code, no markdown, no explanations, no code blocks.`;
```

---

### Task 3: Enhance ChartTransformer Context in chart-generator.ts

**File:** `src/server/api/services/transformation/chart-generator.ts`

**Update createChartTransformer function:**

```typescript
// Change: take: 100 → take: 1000 (or remove limit)
dataPoints: {
  orderBy: { timestamp: "desc" },
  take: 1000,  // Get more data for better AI context
},

// Add: Calculate statistics before calling AI
const allDataPoints = dashboardChart.metric.dataPoints;
const sampleDataPoints = allDataPoints.slice(0, 20).map(dp => ({
  timestamp: dp.timestamp,
  value: dp.value,
  dimensions: dp.dimensions as Record<string, unknown> | null,
}));

// Calculate data statistics
const timestamps = allDataPoints.map(dp => dp.timestamp.getTime());
const oldestDate = new Date(Math.min(...timestamps));
const newestDate = new Date(Math.max(...timestamps));
const daysCovered = Math.ceil((newestDate.getTime() - oldestDate.getTime()) / (1000 * 60 * 60 * 24));

// Detect granularity
let detectedGranularity = "daily";
if (allDataPoints.length > 1) {
  const avgGap = (newestDate.getTime() - oldestDate.getTime()) / (allDataPoints.length - 1);
  const avgGapDays = avgGap / (1000 * 60 * 60 * 24);
  if (avgGapDays >= 25) detectedGranularity = "monthly";
  else if (avgGapDays >= 5) detectedGranularity = "weekly";
}

// Extract dimension keys
const dimensionKeys = new Set<string>();
allDataPoints.forEach(dp => {
  if (dp.dimensions && typeof dp.dimensions === 'object') {
    Object.keys(dp.dimensions as object).forEach(k => dimensionKeys.add(k));
  }
});
```

---

### Task 4: Update generateChartTransformerCode to Accept Statistics

**File:** `src/server/api/services/transformation/ai-code-generator.ts`

**Update interface and function:**

```typescript
interface GenerateChartTransformerInput {
  metricName: string;
  metricDescription: string;
  sampleDataPoints: Array<{
    timestamp: Date;
    value: number;
    dimensions: Record<string, unknown> | null;
  }>;
  chartType: string;
  dateRange: string;
  aggregation: string;
  userPrompt?: string;
  // NEW: Data statistics
  dataStats?: {
    totalCount: number;
    dateRange: { from: string; to: string };
    daysCovered: number;
    detectedGranularity: "daily" | "weekly" | "monthly";
    dimensionKeys: string[];
  };
}

// Update user prompt construction
let userPrompt = `DataPoint sample (first ${dataPointSample.length} of ${input.dataStats?.totalCount ?? dataPointSample.length}):
${JSON.stringify(dataPointSample, null, 2)}

Data Statistics:
- Total data points: ${input.dataStats?.totalCount ?? dataPointSample.length}
- Date range: ${input.dataStats?.dateRange.from ?? "unknown"} to ${input.dataStats?.dateRange.to ?? "unknown"}
- Days covered: ${input.dataStats?.daysCovered ?? "unknown"}
- Detected granularity: ${input.dataStats?.detectedGranularity ?? "unknown"}
- Available dimensions: ${input.dataStats?.dimensionKeys?.join(", ") || "none"}

Preferences:
- chartType: ${input.chartType}
- dateRange: ${input.dateRange}
- aggregation: ${input.aggregation}

Metric name: ${input.metricName}
Metric description: ${input.metricDescription}`;
```

---

### Task 5: Increase Token Limits

**File:** `src/server/api/services/transformation/ai-code-generator.ts`

**Update maxOutputTokens in all generateText calls:**

```typescript
// For DataIngestionTransformer
const result = await generateText({
  model: openrouter("anthropic/claude-sonnet-4"),
  system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
  prompt: userPrompt,
  maxOutputTokens: 4000,  // Increased from 2000
  temperature: 0.1,
});

// For ChartTransformer
const result = await generateText({
  model: openrouter("anthropic/claude-sonnet-4"),
  system: CHART_TRANSFORMER_SYSTEM_PROMPT,
  prompt: userPrompt,
  maxOutputTokens: 4000,  // Increased from 2000
  temperature: 0.1,
});

// For regeneration
const result = await generateText({
  model: openrouter("anthropic/claude-sonnet-4"),
  system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
  prompt: userPrompt,
  maxOutputTokens: 4000,  // Increased from 2000
  temperature: 0.2,
});
```

---

## Summary of Files to Modify

1. `src/server/api/services/transformation/ai-code-generator.ts`
   - Update METRIC_TRANSFORMER_SYSTEM_PROMPT (add timestamp normalization)
   - Update CHART_TRANSFORMER_SYSTEM_PROMPT (add examples, chart type guide)
   - Update GenerateChartTransformerInput interface (add dataStats)
   - Update generateChartTransformerCode (include stats in prompt)
   - Increase maxOutputTokens to 4000

2. `src/server/api/services/transformation/chart-generator.ts`
   - Update createChartTransformer (calculate and pass data statistics)
   - Update regenerateChartTransformer (same changes)
   - Increase data points fetch limit

---

## Expected Outcomes

1. **No timestamp duplicates** - Cron can run multiple times safely
2. **Smart chart generation** - AI knows full data context
3. **Better chart types** - AI can suggest appropriate chart type
4. **Proper shadcn configs** - AI has examples to follow
5. **All data displayed** - Charts show complete time range
6. **No token failures** - Increased limits prevent truncation
