/**
 * AI Generator Service
 *
 * Uses OpenRouter (Claude) to generate TypeScript transformer code.
 * - MetricTransformer: Raw API → DataPoints
 * - ChartTransformer: DataPoints → ChartConfig
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { env } from "@/env";

// =============================================================================
// Types
// =============================================================================

interface GenerateMetricTransformerInput {
  templateId: string;
  integrationId: string;
  endpoint: string;
  method: string;
  sampleApiResponse: unknown;
  metricDescription: string;
  availableParams: string[];
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
}

interface GeneratedCode {
  code: string;
  reasoning: string;
}

// =============================================================================
// Prompts
// =============================================================================

const METRIC_TRANSFORMER_SYSTEM_PROMPT = `You are a TypeScript code generator that creates data transformation functions.

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
10. For time-series data (arrays), map each item to a DataPoint
11. For single-value data, create one DataPoint with current timestamp

Output ONLY the function code, no markdown, no explanations, just pure TypeScript.`;

const CHART_TRANSFORMER_SYSTEM_PROMPT = `You are a TypeScript code generator for Recharts chart configurations.

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
1. Function signature: function transform(dataPoints: DataPoint[], preferences: { chartType: string; dateRange: string; aggregation: string }): ChartConfig
2. Apply dateRange filter (7d, 30d, 90d, all)
3. Apply aggregation if specified (sum, avg, max per day/week/month)
4. Sort chronologically for time-series charts
5. Use var(--chart-1) through var(--chart-12) for colors
6. Format dates as readable strings for chart labels
7. If dimensions exist and user wants multi-line chart, extract from dimensions
8. Always return a valid ChartConfig object

Output ONLY the function code, no markdown, no explanations, just pure TypeScript.`;

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
 * Generate MetricTransformer code using AI
 */
export async function generateMetricTransformerCode(
  input: GenerateMetricTransformerInput,
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  const userPrompt = `Template: ${input.templateId}
Integration: ${input.integrationId}
Endpoint: ${input.method} ${input.endpoint}

ACTUAL API Response (fetched just now):
${JSON.stringify(input.sampleApiResponse, null, 2)}

This template tracks: ${input.metricDescription}

Parameters available in endpointConfig: ${input.availableParams.join(", ")}

Generate the TypeScript transform function.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.1,
  });

  // Clean the code - remove markdown code blocks if present
  let code = result.text.trim();
  if (code.startsWith("```typescript")) {
    code = code.slice("```typescript".length);
  } else if (code.startsWith("```ts")) {
    code = code.slice("```ts".length);
  } else if (code.startsWith("```")) {
    code = code.slice(3);
  }
  if (code.endsWith("```")) {
    code = code.slice(0, -3);
  }
  code = code.trim();

  return {
    code,
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

  const dataPointSample = input.sampleDataPoints.slice(0, 10).map((dp) => ({
    timestamp: dp.timestamp.toISOString(),
    value: dp.value,
    dimensions: dp.dimensions,
  }));

  let userPrompt = `DataPoint sample (first ${dataPointSample.length}):
${JSON.stringify(dataPointSample, null, 2)}

Preferences:
- chartType: ${input.chartType}
- dateRange: ${input.dateRange}
- aggregation: ${input.aggregation}

Metric name: ${input.metricName}
Metric description: ${input.metricDescription}`;

  if (input.userPrompt) {
    userPrompt += `\n\nUser request: "${input.userPrompt}"`;
  }

  userPrompt += "\n\nGenerate the TypeScript transform function.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: CHART_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.1,
  });

  // Clean the code
  let code = result.text.trim();
  if (code.startsWith("```typescript")) {
    code = code.slice("```typescript".length);
  } else if (code.startsWith("```ts")) {
    code = code.slice("```ts".length);
  } else if (code.startsWith("```")) {
    code = code.slice(3);
  }
  if (code.endsWith("```")) {
    code = code.slice(0, -3);
  }
  code = code.trim();

  return {
    code,
    reasoning: input.userPrompt
      ? `Generated chart transformer based on user request: "${input.userPrompt}"`
      : `Generated ${input.chartType} chart transformer for ${input.metricName}.`,
  };
}

/**
 * Regenerate MetricTransformer code with new sample data
 */
export async function regenerateMetricTransformerCode(
  input: GenerateMetricTransformerInput & {
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

  userPrompt += "\n\nGenerate a FIXED TypeScript transform function.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: METRIC_TRANSFORMER_SYSTEM_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 2000,
    temperature: 0.2,
  });

  // Clean the code
  let code = result.text.trim();
  if (code.startsWith("```typescript")) {
    code = code.slice("```typescript".length);
  } else if (code.startsWith("```ts")) {
    code = code.slice("```ts".length);
  } else if (code.startsWith("```")) {
    code = code.slice(3);
  }
  if (code.endsWith("```")) {
    code = code.slice(0, -3);
  }
  code = code.trim();

  return {
    code,
    reasoning: `Regenerated transformer for ${input.templateId} after failure.`,
  };
}
