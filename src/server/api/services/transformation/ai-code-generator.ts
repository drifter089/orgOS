/**
 * AI Code Generator Service
 *
 * Uses OpenRouter (Claude) to generate TypeScript transformer code.
 * - DataIngestionTransformer: Raw API → DataPoints
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { env } from "@/env";

import { cleanGeneratedCode } from "./utils";

// =============================================================================
// Types
// =============================================================================

interface GenerateDataIngestionTransformerInput {
  templateId: string;
  integrationId: string;
  endpoint: string;
  method: string;
  sampleApiResponse: unknown;
  metricDescription: string;
  availableParams: string[];
}

interface DataStats {
  totalCount: number;
  dateRange: { from: string; to: string };
  daysCovered: number;
  detectedGranularity: "daily" | "weekly" | "monthly";
  dimensionKeys: string[];
}

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
  dataStats?: DataStats;
}

interface GeneratedCode {
  code: string;
  reasoning: string;
}

// =============================================================================
// Prompts
// =============================================================================

const METRIC_TRANSFORMER_SYSTEM_PROMPT = `You are a JavaScript code generator that creates data transformation functions.

IMPORTANT: Generate PLAIN JAVASCRIPT only. NO TypeScript syntax.

=== CONTEXT ===
This transformer runs via CRON JOB repeatedly. Each run fetches API data and saves to database.
The database has a UNIQUE CONSTRAINT on (metricId, timestamp) - only ONE data point per timestamp allowed.
Your function must output AGGREGATED data - one DataPoint per unique timestamp (typically per day).

=== OUTPUT SCHEMA ===
DataPoint: { timestamp: Date, value: number, dimensions: object | null }

=== CRITICAL RULES ===

1. Function signature: function transform(apiResponse, endpointConfig) { ... }
2. NO TypeScript syntax
3. Return array of DataPoint objects

4. **AGGREGATION IS REQUIRED** - Output ONE DataPoint per unique timestamp:
   - If API returns 100 items for same day → aggregate into 1 DataPoint for that day
   - Group by normalized date, then sum/count values
   - Example: 5 issues completed on Jan 15 → { timestamp: "2024-01-15", value: 5 }

5. **TIMESTAMP NORMALIZATION** - All timestamps must be start of day (midnight UTC):
   - Use: new Date(dateString).toISOString().split('T')[0] + 'T00:00:00.000Z'
   - This ensures same day = same timestamp key

6. **AGGREGATION PATTERN** (use this approach):
   \`\`\`
   const byDay = {};
   items.forEach(item => {
     const day = new Date(item.date).toISOString().split('T')[0];
     if (!byDay[day]) byDay[day] = { count: 0, ...otherMetrics };
     byDay[day].count++;
     // sum other numeric fields as needed
   });
   return Object.entries(byDay).map(([day, data]) => ({
     timestamp: new Date(day + 'T00:00:00.000Z'),
     value: data.count,
     dimensions: { ...otherAggregatedValues }
   }));
   \`\`\`

7. **PRESERVE DATA GRANULARITY** - Don't over-aggregate:
   - If API data is already daily → keep daily
   - If API data is weekly → keep weekly (use week start date)
   - If API data is monthly → keep monthly (use month start date)
   - Only aggregate when data is more granular (hourly/per-item → daily)

8. Handle missing values: use || 0 for numbers
9. dimensions: put related metrics (e.g., {completed: 50, canceled: 5})

Output ONLY the function code, no markdown, no explanations.`;

const CHART_TRANSFORMER_SYSTEM_PROMPT = `You are a JavaScript code generator for Recharts chart configurations.

IMPORTANT: Generate PLAIN JAVASCRIPT only. NO TypeScript syntax.

=== CONTEXT ===
Data accumulates over time via cron jobs. The same chart transformer code runs repeatedly
as more data gets added to the database. Your code must handle:
- Small datasets (initial data, few points)
- Large datasets (accumulated over weeks/months, many points)
The data format stays consistent - only the NUMBER of entries grows over time.
All timestamps are normalized to midnight UTC (start of day) in a consistent format.

Given:
- DataPoint array with timestamp, value, and optional dimensions
- Data statistics (totalCount, dateRange, dimensionKeys)
- User preferences (chartType, dateRange, aggregation)

Generate a JavaScript function that transforms DataPoints into a Recharts-compatible config.

DataPoint schema:
{
  timestamp: Date,           // Normalized to midnight UTC (e.g., "2024-01-15T00:00:00.000Z")
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

// =============================================================================
// AI Generator Functions
// =============================================================================

function getOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}

/**
 * Generate DataIngestionTransformer code using AI
 */
export async function generateDataIngestionTransformerCode(
  input: GenerateDataIngestionTransformerInput,
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  const userPrompt = `Template: ${input.templateId}
Integration: ${input.integrationId}
Endpoint: ${input.method} ${input.endpoint}

ACTUAL API Response (fetched just now):
${JSON.stringify(input.sampleApiResponse, null, 2)}

This template tracks: ${input.metricDescription}

Parameters available in endpointConfig: ${input.availableParams.join(", ")}

Generate the JavaScript transform function.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Generated transformer for ${input.templateId} based on actual API response structure.`,
  };
}

/**
 * Generate ChartTransformer code using AI
 */
export async function generateChartTransformerCode(
  input: GenerateChartTransformerInput,
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  // Increase sample size to 20 for better AI context
  const dataPointSample = input.sampleDataPoints.slice(0, 20).map((dp) => ({
    timestamp: dp.timestamp.toISOString(),
    value: dp.value,
    dimensions: dp.dimensions,
  }));

  const totalCount = input.dataStats?.totalCount ?? dataPointSample.length;

  let userPrompt = `DataPoint sample (first ${dataPointSample.length} of ${totalCount}):
${JSON.stringify(dataPointSample, null, 2)}

Data Statistics:
- Total data points: ${totalCount}
- Date range: ${input.dataStats?.dateRange.from ?? "unknown"} to ${input.dataStats?.dateRange.to ?? "unknown"}
- Days covered: ${input.dataStats?.daysCovered ?? "unknown"}
- Detected granularity: ${input.dataStats?.detectedGranularity ?? "unknown"}
- Available dimensions: ${input.dataStats?.dimensionKeys?.join(", ") ?? "none"}

Preferences:
- chartType: ${input.chartType}
- dateRange: ${input.dateRange}
- aggregation: ${input.aggregation}

Metric name: ${input.metricName}
Metric description: ${input.metricDescription}`;

  if (input.userPrompt) {
    userPrompt += `\n\nUser request: "${input.userPrompt}"`;
  }

  userPrompt += "\n\nGenerate the JavaScript transform function.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: CHART_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: input.userPrompt
      ? `Generated chart transformer based on user request: "${input.userPrompt}"`
      : `Generated ${input.chartType} chart transformer for ${input.metricName}.`,
  };
}

/**
 * Regenerate DataIngestionTransformer code with new sample data
 */
export async function regenerateDataIngestionTransformerCode(
  input: GenerateDataIngestionTransformerInput & {
    previousCode?: string;
    error?: string;
  },
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  let userPrompt = `Template: ${input.templateId}
Integration: ${input.integrationId}
Endpoint: ${input.method} ${input.endpoint}

ACTUAL API Response (fetched just now):
${JSON.stringify(input.sampleApiResponse, null, 2)}

This template tracks: ${input.metricDescription}

Parameters available in endpointConfig: ${input.availableParams.join(", ")}`;

  if (input.previousCode) {
    userPrompt += `\n\nPrevious transformer code that FAILED:
${input.previousCode}`;
  }

  if (input.error) {
    userPrompt += `\n\nError message:
${input.error}`;
  }

  userPrompt += "\n\nGenerate a FIXED JavaScript transform function.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.2,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Regenerated transformer for ${input.templateId} after failure.`,
  };
}
