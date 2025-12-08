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

const METRIC_TRANSFORMER_SYSTEM_PROMPT = `You are a JavaScript code generator that creates data transformation functions.

IMPORTANT: Generate PLAIN JAVASCRIPT only. NO TypeScript syntax (no type annotations, no "as" casts, no ": type" annotations).

Given:
- An API endpoint and its ACTUAL response (real data, not documentation)
- The target DataPoint schema

Generate a JavaScript function that transforms the API response into DataPoint objects.

DataPoint schema:
{
  timestamp: Date,           // When this data point occurred
  value: number,             // Primary numeric value (always required)
  dimensions: object | null, // Additional related values (optional)
}

Rules:
1. The function signature must be:
   function transform(apiResponse, endpointConfig) { ... }
2. NO TypeScript - no ": type" annotations, no "as Type" casts, no generics
3. Return an array of DataPoint objects
4. Handle missing/null values gracefully (use || 0 for numbers)
5. Parse date strings into Date objects with new Date(dateString)
6. Convert string numbers to actual numbers with parseInt/parseFloat
7. Put the PRIMARY metric value in 'value' field
8. Put RELATED values in 'dimensions' object (e.g., {likes: 50, deletions: 200})
9. Always return an array, even for single values
10. For time-series data (arrays), map each item to a DataPoint
11. For single-value data, create one DataPoint with current timestamp

Output ONLY the function code, no markdown, no explanations, no code blocks, just pure JavaScript.`;

const CHART_TRANSFORMER_SYSTEM_PROMPT = `You are a JavaScript code generator for Recharts chart configurations.

IMPORTANT: Generate PLAIN JAVASCRIPT only. NO TypeScript syntax (no type annotations, no "as" casts, no ": type" annotations).

Given:
- DataPoint array with timestamp, value, and optional dimensions
- User preferences (chartType, dateRange, aggregation)

Generate a JavaScript function that transforms DataPoints into a Recharts-compatible config.

DataPoint schema:
{
  timestamp: Date,
  value: number,
  dimensions: object | null  // e.g., {likes: 50, deletions: 200}
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
}

Rules:
1. Function signature: function transform(dataPoints, preferences) { ... }
2. NO TypeScript - no ": type" annotations, no "as Type" casts, no generics
3. Apply dateRange filter (7d, 30d, 90d, all)
4. Apply aggregation if specified (sum, avg, max per day/week/month)
5. Sort chronologically for time-series charts
6. Use var(--chart-1) through var(--chart-12) for colors
7. Format dates as readable strings for chart labels
8. If dimensions exist and user wants multi-line chart, extract from dimensions
9. Always return a valid ChartConfig object

Output ONLY the function code, no markdown, no explanations, no code blocks, just pure JavaScript.`;

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
    maxOutputTokens: 2000,
    temperature: 0.1,
  });

  // Clean the code - remove markdown code blocks if present
  let code = result.text.trim();

  if (code.startsWith("```typescript")) {
    code = code.slice("```typescript".length);
  } else if (code.startsWith("```ts")) {
    code = code.slice("```ts".length);
  } else if (code.startsWith("```javascript")) {
    code = code.slice("```javascript".length);
  } else if (code.startsWith("```js")) {
    code = code.slice("```js".length);
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

  userPrompt += "\n\nGenerate the JavaScript transform function.";

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
  } else if (code.startsWith("```javascript")) {
    code = code.slice("```javascript".length);
  } else if (code.startsWith("```js")) {
    code = code.slice("```js".length);
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
    maxOutputTokens: 2000,
    temperature: 0.2,
  });

  // Clean the code
  let code = result.text.trim();

  if (code.startsWith("```typescript")) {
    code = code.slice("```typescript".length);
  } else if (code.startsWith("```ts")) {
    code = code.slice("```ts".length);
  } else if (code.startsWith("```javascript")) {
    code = code.slice("```javascript".length);
  } else if (code.startsWith("```js")) {
    code = code.slice("```js".length);
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
