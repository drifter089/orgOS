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
  /** Developer-authored extraction prompt with hints about timestamp, aggregation, dimensions */
  extractionPrompt?: string;
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
  selectedDimension?: string; // User can select a dimension to track (e.g., "estimate" for effort points)
}

interface GeneratedCode {
  code: string;
  reasoning: string;
  suggestedCadence?: "DAILY" | "WEEKLY" | "MONTHLY";
}

interface GeneratedDataIngestionCode extends GeneratedCode {
  valueLabel?: string;
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

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "code": "function transform(apiResponse, endpointConfig) { ... }",
  "valueLabel": "commits"
}

REQUIRED FIELDS:
- code: The JavaScript transform function
- valueLabel: A SHORT label for what the value represents (e.g., "commits", "stars", "views", "issues", "subscribers", "points"). This will be shown next to the number in the UI (e.g., "1,234 commits")

Output ONLY valid JSON, no markdown or code blocks.`;

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
  title: string,           // REQUIRED: Full descriptive title for the chart
  description: string,     // REQUIRED: SHORT description of how data is aggregated
  valueLabel: string,      // REQUIRED: Short label for the primary value (e.g., "commits", "issues")
  showLegend?: boolean,
  showTooltip?: boolean,
  stacked?: boolean,
  centerLabel?: { value: string, label: string }
}

REQUIRED METADATA FIELDS:
- title: Full descriptive title for the chart. Include relevant context like metric name, team, or project.
  Examples: "Daily Commits", "Completed Issues for Backend Team", "Video Views for Channel"
  DO NOT include cadence if the x-axis already shows time periods.
- description: SHORT description of how data is aggregated and displayed.
  Examples: "Sum of commits per day", "Running total of issues", "Average story points per sprint"
- valueLabel: Short label for the primary value being tracked. This appears next to the main number.
  Examples: "commits", "issues", "story points", "views", "subscribers"
  Should be lowercase, plural form.
  NOTE: valueLabel can be the default metric label OR a dimension key label if user selects a dimension.

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
  description: "Total commits per day",
  valueLabel: "commits",
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
  description: "Lines added and deleted, summed weekly",
  valueLabel: "lines",
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
7. ALWAYS include title, description, and valueLabel in the output

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
): Promise<GeneratedDataIngestionCode> {
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

  // Build system prompt - prepend extraction prompt if provided
  let systemPrompt = METRIC_TRANSFORMER_SYSTEM_PROMPT;
  if (input.extractionPrompt) {
    systemPrompt = `DEVELOPER EXTRACTION GUIDANCE (FOLLOW THIS):
════════════════════════════════════════════════════════════════════════════════
${input.extractionPrompt}
════════════════════════════════════════════════════════════════════════════════

The above guidance comes from the template author. Follow it precisely.

${systemPrompt}`;
  }

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

Generate the JavaScript transform function and return as JSON with code and valueLabel.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  const parsed = parseDataIngestionTransformerResponse(result.text);

  return {
    code: parsed.code,
    valueLabel: parsed.valueLabel,
    reasoning: `Generated transformer for ${input.templateId} based on actual API response structure.`,
  };
}

/**
 * Extract JSON from a response that may contain markdown or prose.
 * Handles cases where AI adds explanation text before/after the JSON.
 */
function extractJsonFromResponse(response: string): string | null {
  // Try to find JSON in markdown code block first
  const jsonBlockMatch = /```(?:json)?\s*\n?([\s\S]*?)\n?```/.exec(response);
  if (jsonBlockMatch?.[1]) {
    const content = jsonBlockMatch[1].trim();
    // Verify it looks like JSON (starts with { or [)
    if (content.startsWith("{") || content.startsWith("[")) {
      return content;
    }
  }

  // Try to find raw JSON object in the response
  const jsonMatch = /\{[\s\S]*"code"[\s\S]*\}/.exec(response);
  if (jsonMatch?.[0]) {
    return jsonMatch[0];
  }

  return null;
}

/**
 * Parse AI response that returns JSON with code and valueLabel.
 * Uses 2 fallback layers:
 * 1. Direct JSON parse
 * 2. Markdown extraction
 * Throws if parsing fails (no silent fallbacks to broken code).
 */
function parseDataIngestionTransformerResponse(response: string): {
  code: string;
  valueLabel?: string;
} {
  // Layer 1: Direct JSON parse
  try {
    const parsed = JSON.parse(response) as {
      code?: string;
      valueLabel?: string;
    };
    if (parsed.code) {
      return {
        code: cleanGeneratedCode(parsed.code),
        valueLabel: parsed.valueLabel,
      };
    }
  } catch {
    // Direct parse failed, try markdown extraction
  }

  // Layer 2: Extract JSON from markdown or prose
  const extractedJson = extractJsonFromResponse(response);
  if (extractedJson) {
    try {
      const parsed = JSON.parse(extractedJson) as {
        code?: string;
        valueLabel?: string;
      };
      if (parsed.code) {
        return {
          code: cleanGeneratedCode(parsed.code),
          valueLabel: parsed.valueLabel,
        };
      }
    } catch {
      // Extracted content wasn't valid JSON either
    }
  }

  // No fallback - throw clear error
  throw new Error(
    "Failed to parse AI response as JSON. Response did not contain valid JSON with 'code' field.",
  );
}

/**
 * Parse AI response that returns JSON with code and optional suggestedCadence.
 * Uses 2 fallback layers:
 * 1. Direct JSON parse
 * 2. Markdown extraction
 * Throws if parsing fails (no silent fallbacks to broken code).
 */
function parseChartTransformerResponse(response: string): {
  code: string;
  suggestedCadence?: "DAILY" | "WEEKLY" | "MONTHLY";
} {
  // Layer 1: Direct JSON parse
  try {
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
    // Direct parse failed, try markdown extraction
  }

  // Layer 2: Extract JSON from markdown or prose
  const extractedJson = extractJsonFromResponse(response);
  if (extractedJson) {
    try {
      const parsed = JSON.parse(extractedJson) as {
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
      // Extracted content wasn't valid JSON either
    }
  }

  // No fallback - throw clear error
  throw new Error(
    "Failed to parse chart transformer AI response as JSON. Response did not contain valid JSON with 'code' field.",
  );
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
      cadence: input.cadence,
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

  // Add selected dimension preference if specified
  if (input.selectedDimension && input.selectedDimension !== "value") {
    userPrompt += `

USER DIMENSION PREFERENCE:
Instead of tracking the default "value" field, track the "${input.selectedDimension}" dimension.
- Aggregate this dimension when grouping by period (SUM the dimension values, not counts)
- Set valueLabel to something appropriate for this dimension (e.g., "points" for "estimate")
- The chartData should show the aggregated dimension values, not issue counts`;
  }

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
): Promise<GeneratedDataIngestionCode> {
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

  // Build system prompt - prepend extraction prompt if provided
  let systemPrompt = METRIC_TRANSFORMER_SYSTEM_PROMPT;
  if (input.extractionPrompt) {
    systemPrompt = `DEVELOPER EXTRACTION GUIDANCE (FOLLOW THIS):
════════════════════════════════════════════════════════════════════════════════
${input.extractionPrompt}
════════════════════════════════════════════════════════════════════════════════

The above guidance comes from the template author. Follow it precisely.

${systemPrompt}`;
  }

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

  userPrompt +=
    "\n\nGenerate a FIXED JavaScript transform function and return as JSON with code and valueLabel.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: systemPrompt,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.2,
  });

  const parsed = parseDataIngestionTransformerResponse(result.text);

  return {
    code: parsed.code,
    valueLabel: parsed.valueLabel,
    reasoning: `Regenerated transformer for ${input.templateId} after failure.`,
  };
}
