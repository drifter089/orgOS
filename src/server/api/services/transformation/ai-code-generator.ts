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

import {
  generateGSheetsChartCode,
  generateGSheetsDataIngestionCode,
  regenerateGSheetsDataIngestionCode,
} from "./gsheets";
import { cleanGeneratedCode, safeStringifyForPrompt } from "./utils";

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
  endpointConfig?: Record<string, string>;
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
  cadence: string; // "DAILY" | "WEEKLY" | "MONTHLY"
  userPrompt?: string;
  dataStats?: DataStats;
  templateId?: string; // Used to route to Google Sheets specific generator
}

interface GeneratedCode {
  code: string;
  reasoning: string;
  suggestedCadence?: "DAILY" | "WEEKLY" | "MONTHLY";
}

// =============================================================================
// Prompts
// =============================================================================

const METRIC_TRANSFORMER_SYSTEM_PROMPT = `Generate JavaScript: function transform(apiResponse, endpointConfig) → DataPoint[]

This transformer runs on initial setup AND periodically via cron job to collect time-series data. Each run fetches fresh API data and upserts into database by timestamp.

DataPoint = { timestamp: Date, value: number, dimensions: object|null }

CRITICAL RULES:

1. NO TypeScript - plain JavaScript only

2. TIMESTAMPS - Each DataPoint MUST have a UNIQUE timestamp:
   - Database has unique constraint on (metricId, timestamp)
   - If API has date field: use new Date(item.date) or new Date(item.created_at)
   - If API returns pre-aggregated data (daily/weekly): preserve that granularity
   - If API returns individual events: group by day with date.setUTCHours(0,0,0,0)
   - NEVER output duplicate timestamps

3. VALUES - Choose aggregation based on metric semantics:
   - COUNTS (commits, issues, tasks): SUM per period
   - GAUGES (queue depth, balance, temperature): LAST value per period
   - RATES (requests/sec, velocity): AVERAGE per period
   - PERCENTAGES/RATIOS: AVERAGE, never sum

4. DIMENSIONS - Preserve original API field names:
   - Use EXACT field names from API (e.g., if API has "additions", use "additions" not "added")
   - Store raw values, don't create derived metrics (no "netChanges = additions - deletions")
   - Example: API has {additions: 500, deletions: 200} → dimensions: {additions: 500, deletions: 200}
   - NOT for static metadata like names, IDs, or URLs

5. EXTRACTION - Find the data in API response:
   - Common patterns: apiResponse.data, .items, .results, .issues, or root array
   - Handle empty: return []
   - Handle pagination markers gracefully (ignore next_cursor, etc.)

6. ROBUSTNESS:
   - Missing values: use || 0 or || null
   - Invalid dates: skip that item
   - Unexpected structure: return []

Output ONLY the function code, no markdown.`;

const CHART_TRANSFORMER_SYSTEM_PROMPT = `Generate JavaScript: function transform(dataPoints, preferences) → ChartConfig

This function runs on EVERY data refresh (cron job). It receives ALL historical data points from DB (up to 1000), not just new ones. The chart should show the full time series.

Input:
- dataPoints: Array of { timestamp: string (ISO), value: number, dimensions: object|null }
- preferences: { chartType: string, cadence: "DAILY"|"WEEKLY"|"MONTHLY" }

Output ChartConfig (shadcn/ui chart format):
{
  chartType: "line"|"bar"|"area"|"pie"|"radar"|"radial"|"kpi",
  chartData: Array of objects with xAxisKey + dataKeys,
  chartConfig: { [dataKey]: { label: string, color: string } },
  xAxisKey: string,
  dataKeys: string[],
  title: string,
  showLegend?: boolean,
  showTooltip?: boolean,
  stacked?: boolean,
  centerLabel?: { value: string, label: string }
}

CADENCE determines how to aggregate data:
- DAILY: Group by day, one data point per day
- WEEKLY: Group by week (Monday-Sunday), one data point per week
- MONTHLY: Group by month, one data point per month

AGGREGATION METHOD (choose based on metric type):
- COUNTS (commits, views, tasks): SUM values within period
- GAUGES (temperature, queue depth): use LAST or AVG
- RATES (velocity, requests/sec): AVG
- PERCENTAGES: AVG (never sum)

EXAMPLE OUTPUT for line chart:
{
  chartType: "line",
  chartData: [
    { date: "Jan 1", commits: 12 },
    { date: "Jan 2", commits: 8 },
    { date: "Jan 3", commits: 15 }
  ],
  chartConfig: {
    commits: { label: "Commits", color: "var(--chart-1)" }
  },
  xAxisKey: "date",
  dataKeys: ["commits"],
  title: "Daily Commits",
  showLegend: false,
  showTooltip: true
}

EXAMPLE with dimensions (multi-series):
{
  chartType: "area",
  chartData: [
    { date: "Jan 1", additions: 500, deletions: 200 },
    { date: "Jan 2", additions: 300, deletions: 150 }
  ],
  chartConfig: {
    additions: { label: "Additions", color: "var(--chart-1)" },
    deletions: { label: "Deletions", color: "var(--chart-2)" }
  },
  xAxisKey: "date",
  dataKeys: ["additions", "deletions"],
  title: "Code Changes",
  showLegend: true,
  stacked: true
}

RULES:
1. NO TypeScript - plain JavaScript only
2. Colors: var(--chart-1) through var(--chart-12)
3. Aggregate data based on cadence (DAILY/WEEKLY/MONTHLY)
4. Format dates as readable strings: "Jan 15" or "Week of Jan 15" or "Jan 2024"
5. If dimensions exist, extract them as separate data keys
6. Sort chronologically (oldest first) for time series

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "code": "function transform(dataPoints, preferences) { ... }",
  "suggestedCadence": "WEEKLY" // ONLY if user prompt implies a cadence change
}

IMPORTANT: If the user prompt mentions time periods like "weekly", "by week", "monthly", "by month", "daily", "by day", etc., include suggestedCadence in your response. Otherwise, omit it.

Output ONLY valid JSON, no markdown or code blocks.`;

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
 *
 * Routes to Google Sheets specific generator for gsheets-* templates.
 */
export async function generateDataIngestionTransformerCode(
  input: GenerateDataIngestionTransformerInput,
): Promise<GeneratedCode> {
  // Route to Google Sheets specific generator
  if (input.templateId.startsWith("gsheets-")) {
    const sheetName = input.endpointConfig?.SHEET_NAME ?? "Sheet1";
    const dataRange = input.endpointConfig?.DATA_RANGE;

    return generateGSheetsDataIngestionCode({
      templateId: input.templateId,
      sampleApiResponse: input.sampleApiResponse,
      sheetName,
      dataRange,
    });
  }

  // Standard API transformer generation
  const openrouter = getOpenRouterClient();

  const sanitizedResponse = safeStringifyForPrompt(input.sampleApiResponse);

  const userPrompt = `Template: ${input.templateId}
Integration: ${input.integrationId}
Endpoint: ${input.method} ${input.endpoint}

ACTUAL API Response (fetched just now):
${sanitizedResponse}

Metric description: ${input.metricDescription}

Analyze the API response structure and determine:
1. Where is the data array? (response root, .data, .items, .results, etc.)
2. What field contains the timestamp? (created_at, date, timestamp, etc.)
3. What is the metric type? (count, gauge, rate, percentage)
4. What fields should go in dimensions?

Parameters available in endpointConfig: ${input.availableParams.join(", ") || "none"}

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
 * Parse AI response that returns JSON with code and optional suggestedCadence
 */
function parseChartTransformerResponse(response: string): {
  code: string;
  suggestedCadence?: "DAILY" | "WEEKLY" | "MONTHLY";
} {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(response) as {
      code?: string;
      suggestedCadence?: string;
    };
    if (parsed.code) {
      return {
        code: cleanGeneratedCode(parsed.code),
        suggestedCadence: parsed.suggestedCadence as
          | "DAILY"
          | "WEEKLY"
          | "MONTHLY"
          | undefined,
      };
    }
  } catch {
    // If JSON parsing fails, treat the whole response as code (fallback)
  }

  // Fallback: treat the entire response as code
  return { code: cleanGeneratedCode(response) };
}

/**
 * Generate ChartTransformer code using AI
 *
 * Routes to Google Sheets specific generator for gsheets-* templates.
 */
export async function generateChartTransformerCode(
  input: GenerateChartTransformerInput,
): Promise<GeneratedCode> {
  // Route to Google Sheets specific generator
  if (input.templateId?.startsWith("gsheets-")) {
    return generateGSheetsChartCode({
      metricName: input.metricName,
      metricDescription: input.metricDescription,
      sampleDataPoints: input.sampleDataPoints,
      chartType: input.chartType,
      dateRange: input.dateRange,
      aggregation: input.aggregation,
      userPrompt: input.userPrompt,
    });
  }

  // Standard chart transformer generation
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
- cadence: ${input.cadence} (aggregate data to this level)

Metric name: ${input.metricName}
Metric description: ${input.metricDescription}`;

  if (input.userPrompt) {
    userPrompt += `\n\nUser request: "${input.userPrompt}"`;
  }

  userPrompt +=
    "\n\nGenerate the JavaScript transform function and return as JSON.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: CHART_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  const parsed = parseChartTransformerResponse(result.text);

  return {
    code: parsed.code,
    reasoning: input.userPrompt
      ? `Generated chart transformer based on user request: "${input.userPrompt}"`
      : `Generated ${input.chartType} chart transformer for ${input.metricName}.`,
    suggestedCadence: parsed.suggestedCadence,
  };
}

/**
 * Regenerate DataIngestionTransformer code with new sample data
 *
 * Routes to Google Sheets specific regenerator for gsheets-* templates.
 */
export async function regenerateDataIngestionTransformerCode(
  input: GenerateDataIngestionTransformerInput & {
    previousCode?: string;
    error?: string;
  },
): Promise<GeneratedCode> {
  // Route to Google Sheets specific regenerator
  if (input.templateId.startsWith("gsheets-")) {
    const sheetName = input.endpointConfig?.SHEET_NAME ?? "Sheet1";
    const dataRange = input.endpointConfig?.DATA_RANGE;

    return regenerateGSheetsDataIngestionCode({
      templateId: input.templateId,
      sampleApiResponse: input.sampleApiResponse,
      sheetName,
      dataRange,
      previousCode: input.previousCode,
      error: input.error,
    });
  }

  // Standard regeneration
  const openrouter = getOpenRouterClient();

  const sanitizedResponse = safeStringifyForPrompt(input.sampleApiResponse);

  let userPrompt = `Template: ${input.templateId}
Integration: ${input.integrationId}
Endpoint: ${input.method} ${input.endpoint}

ACTUAL API Response (fetched just now):
${sanitizedResponse}

Metric description: ${input.metricDescription}

Parameters available in endpointConfig: ${input.availableParams.join(", ") || "none"}`;

  if (input.previousCode) {
    userPrompt += `\n\nPrevious transformer code that FAILED:
${input.previousCode}`;
  }

  if (input.error) {
    userPrompt += `\n\nError message:
${input.error}

Fix the error while ensuring:
- NO duplicate timestamps in output
- Correct aggregation for metric type
- Proper null/undefined handling`;
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
