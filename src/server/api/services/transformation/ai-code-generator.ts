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

const METRIC_TRANSFORMER_SYSTEM_PROMPT = `Generate JavaScript: function transform(apiResponse, endpointConfig) → DataPoint[]

DataPoint = { timestamp: Date, value: number, dimensions: object|null }

RULES:
1. NO TypeScript syntax - plain JavaScript only
2. Aggregate to ONE DataPoint per day (group items by date, sum/count values)
3. Use dimensions for secondary metrics (e.g., {completed: 50, canceled: 5})
4. Handle missing values with || 0
5. If API data is already daily/weekly/monthly, preserve that granularity
6. Return array sorted by timestamp

Output ONLY the function code, no markdown, no explanations.`;

const CHART_TRANSFORMER_SYSTEM_PROMPT = `Generate JavaScript: function transform(dataPoints, preferences) → ChartConfig

Input:
- dataPoints: Array of { timestamp: Date, value: number, dimensions: object|null }
- preferences: { chartType, dateRange, aggregation }

Output ChartConfig:
{
  chartType: "line"|"bar"|"area"|"pie"|"radar"|"radial"|"kpi",
  chartData: Array of objects,
  chartConfig: { [key]: { label: string, color: string } },
  xAxisKey: string,
  dataKeys: string[],
  title: string,
  showLegend?: boolean,
  showTooltip?: boolean,
  stacked?: boolean,
  centerLabel?: { value: string, label: string }  // for pie/radial
}

RULES:
1. NO TypeScript - plain JavaScript only
2. Use var(--chart-1) through var(--chart-12) for colors
3. For PIE charts: add fill property to each chartData item
4. Filter by dateRange: "7d", "30d", "90d" from now; "all" = no filter
5. Format dates as readable strings (e.g., "Jan 15")
6. If dimensions exist, consider multi-series charts
7. Aggregate if too many points (>50 for line, >20 for bar)

Output ONLY the function code, no markdown, no explanations.`;

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
