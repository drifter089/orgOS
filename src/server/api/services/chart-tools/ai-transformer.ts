/**
 * AI-Powered Graph Data Transformation Service
 *
 * Uses AI to analyze metric data and transform it
 * into Recharts-compatible format for visualization.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Metric } from "@prisma/client";
import { generateText } from "ai";

import { env } from "@/env";

import { type ChartTransformResult, type ChartType } from "./types";

// ============================================================================
// Types & Interfaces
// ============================================================================

export type { ChartTransformResult, ChartType };

/**
 * Result of AI transformation with error handling
 */
export interface TransformResult {
  success: boolean;
  data?: ChartTransformResult;
  error?: string;
}

// ============================================================================
// Main AI Transformation Function
// ============================================================================

/**
 * Transform metric data into chart-ready format using AI
 *
 * @param metric - Prisma Metric model with data
 * @param userHint - Optional hint from user about desired visualization
 * @returns TransformResult with chart data or error
 */
export async function transformMetricWithAI(
  metric: Metric,
  userHint?: string,
): Promise<TransformResult> {
  try {
    const openrouter = createOpenRouter({
      apiKey: env.OPENROUTER_API_KEY,
    });

    // Build the direct transformation prompt
    const systemPrompt = `You are a data visualization expert. Transform the provided metric data into Recharts-compatible chart format with complete styling and configuration.

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "chartType": "line" | "bar" | "area" | "pie" | "radar" | "radial" | "kpi",
  "chartData": [{...}, ...],
  "chartConfig": {"dataKey": {"label": "Display Label", "color": "var(--chart-1)"}},
  "xAxisKey": "keyName",
  "dataKeys": ["value1", "value2"],
  "title": "Chart Title",
  "description": "Brief description of what the chart shows",
  "xAxisLabel": "X Axis Label",
  "yAxisLabel": "Y Axis Label",
  "showLegend": true/false,
  "showTooltip": true,
  "stacked": false,
  "centerLabel": {"value": "Total", "label": "1,234"} (only for pie/radial),
  "reasoning": "Brief explanation of transformation choices"
}

## Chart Type Selection Rules - PRIORITIZE TIME-SERIES:

### TIME-SERIES DATA (dates, timestamps, weeks, months):
- Use LINE for trends over time with many data points (>10)
- Use AREA for cumulative totals or emphasizing volume over time
- Use BAR for time comparisons with few data points (<10)

### CATEGORICAL DATA (names, categories, types):
- Use BAR for comparing values across categories
- Use PIE for part-to-whole relationships (≤8 categories)
- Use RADAR for multi-variable comparison across dimensions

### SINGLE VALUE:
- Use KPI for displaying a single metric value

## Data Transformation Rules:

### Google Sheets Format:
- First row in "values" array is headers
- Subsequent rows are data
- Convert string numbers to actual numbers
- Use header names as keys

### PostHog Format:
- "columns" array contains field names
- "results" array contains data rows
- Map columns to row values

### GitHub Data:
- Group arrays by date/category and count
- Convert timestamps to readable dates
- Extract nested values (e.g., user.login)

## Styling Configuration:

### Colors:
- Use var(--chart-1) through var(--chart-12)
- For pie charts, add "fill" property to each data point

### Labels:
- Title: Descriptive name for the chart
- Description: What insight does this chart provide?
- X-Axis Label: What does the x-axis represent?
- Y-Axis Label: What does the y-axis represent? Include units if applicable

### Features:
- showLegend: true when multiple data series
- showTooltip: true (almost always)
- stacked: true for stacked bar/area charts
- centerLabel: for pie/radial charts, show total or key metric

## Chart Data Structure Examples:

### Bar/Line/Area Chart:
{
  "chartData": [
    {"month": "Jan", "revenue": 1200, "expenses": 800},
    {"month": "Feb", "revenue": 1500, "expenses": 900}
  ],
  "xAxisKey": "month",
  "dataKeys": ["revenue", "expenses"],
  "chartConfig": {
    "revenue": {"label": "Revenue", "color": "var(--chart-1)"},
    "expenses": {"label": "Expenses", "color": "var(--chart-2)"}
  }
}

### Pie Chart:
{
  "chartData": [
    {"name": "Chrome", "value": 275, "fill": "var(--chart-1)"},
    {"name": "Safari", "value": 200, "fill": "var(--chart-2)"},
    {"name": "Firefox", "value": 187, "fill": "var(--chart-3)"}
  ],
  "xAxisKey": "name",
  "dataKeys": ["value"],
  "chartConfig": {
    "chrome": {"label": "Chrome", "color": "var(--chart-1)"},
    "safari": {"label": "Safari", "color": "var(--chart-2)"},
    "firefox": {"label": "Firefox", "color": "var(--chart-3)"}
  },
  "centerLabel": {"value": "662", "label": "Total Visitors"}
}

## Important Rules:
- Always convert string numbers to actual numbers
- Sort time-series data chronologically
- Group and count arrays (don't chart individual items)
- Truncate ISO timestamps to just dates for grouping
- Always return valid JSON without markdown code blocks
- Provide meaningful labels derived from the data context`;

    // Build the user message with full context
    const userMessage = buildMetricPrompt(metric, userHint);

    console.info(
      "[AI Transform] Starting transformation for metric:",
      metric.name,
    );
    if (userHint) {
      console.info("[AI Transform] User hint:", userHint);
    }

    const result = await generateText({
      model: openrouter("google/gemini-2.5-pro-preview"),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
      maxOutputTokens: 8192,
    });

    // Parse the JSON response
    const responseText = result.text.trim();
    console.info(
      "[AI Transform] Raw response:",
      responseText.substring(0, 500),
    );

    // Try to extract JSON from the response
    let jsonStr = responseText;

    // Remove markdown code blocks if present
    const jsonMatch = /```(?:json)?\s*([\s\S]*?)```/.exec(responseText);
    if (jsonMatch) {
      jsonStr = jsonMatch[1]!.trim();
    }

    // Find JSON object in response
    const jsonStartIndex = jsonStr.indexOf("{");
    const jsonEndIndex = jsonStr.lastIndexOf("}");
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonStr = jsonStr.slice(jsonStartIndex, jsonEndIndex + 1);
    }

    const chartResult = JSON.parse(jsonStr) as ChartTransformResult;

    // Validate required fields
    if (
      !chartResult.chartType ||
      !chartResult.chartData ||
      !chartResult.xAxisKey ||
      !chartResult.dataKeys
    ) {
      throw new Error("Invalid chart result: missing required fields");
    }

    console.info("[AI Transform] Parsed chart type:", chartResult.chartType);
    console.info("[AI Transform] Data points:", chartResult.chartData.length);

    // Ensure chartConfig exists and has colors
    if (!chartResult.chartConfig) {
      chartResult.chartConfig = {};
      chartResult.dataKeys.forEach((key, index) => {
        chartResult.chartConfig[key] = {
          label: key,
          color: `var(--chart-${(index % 12) + 1})`,
        };
      });
    }

    // Ensure new required fields have defaults
    if (!chartResult.title) {
      chartResult.title = metric.name;
    }
    if (!chartResult.description) {
      chartResult.description = metric.description ?? "";
    }
    if (!chartResult.xAxisLabel) {
      chartResult.xAxisLabel = chartResult.xAxisKey;
    }
    if (!chartResult.yAxisLabel) {
      chartResult.yAxisLabel =
        chartResult.dataKeys.length === 1 ? chartResult.dataKeys[0]! : "Value";
    }
    chartResult.showLegend ??= chartResult.dataKeys.length > 1;
    chartResult.showTooltip ??= true;

    return {
      success: true,
      data: chartResult,
    };
  } catch (error) {
    console.error("AI transformation error:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown error during AI transformation",
    };
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build the prompt for the AI with metric context
 */
function buildMetricPrompt(metric: Metric, userHint?: string): string {
  const parts: string[] = [];

  parts.push(`## Metric Information`);
  parts.push(`- Name: ${metric.name}`);

  if (metric.description) {
    parts.push(`- Description: ${metric.description}`);
  }

  // Add integration and template context - crucial for understanding data format
  if (metric.integrationId || metric.metricTemplate) {
    parts.push("");
    parts.push(`## Data Source Context`);

    if (metric.metricTemplate) {
      parts.push(`- Template: ${metric.metricTemplate}`);

      // Provide specific guidance based on template
      if (metric.metricTemplate.includes("gsheets")) {
        parts.push(`- Source: Google Sheets`);
        parts.push(
          `- Data Format: Sheets API returns { range, majorDimension: "ROWS", values: [[header], [row1], [row2], ...] }`,
        );
      } else if (metric.metricTemplate.includes("github")) {
        parts.push(`- Source: GitHub API`);
      } else if (metric.metricTemplate.includes("posthog")) {
        parts.push(`- Source: PostHog Analytics`);
      } else if (metric.metricTemplate.includes("youtube")) {
        parts.push(`- Source: YouTube Analytics`);
      }
    }

    // Include endpoint params which contain user's selections
    const params = metric.endpointConfig as Record<string, unknown> | null;
    if (params) {
      // Extract configuration params (not the actual data)
      const configKeys = [
        "SPREADSHEET_ID",
        "SHEET_NAME",
        "LABEL_COLUMN_INDEX",
        "DATA_COLUMN_INDICES",
        "COLUMN_INDEX",
        "PROJECT_ID",
        "OWNER",
        "REPO",
      ];
      const configParams: Record<string, unknown> = {};

      configKeys.forEach((key) => {
        if (params[key] !== undefined) {
          configParams[key] = params[key];
        }
      });

      if (Object.keys(configParams).length > 0) {
        parts.push(`- Configuration: ${JSON.stringify(configParams)}`);
      }
    }
  }

  parts.push("");
  parts.push(`## Raw Data`);
  parts.push("```json");
  parts.push(JSON.stringify(metric.endpointConfig ?? {}, null, 2));
  parts.push("```");

  parts.push("");
  parts.push(
    `Transform this data into a complete chart configuration with title, labels, legend settings, and tooltip configuration.`,
  );

  // Put user hint LAST so AI prioritizes it
  if (userHint) {
    parts.push("");
    parts.push(`## USER REQUEST (HIGHEST PRIORITY)`);
    parts.push(`The user specifically requested: "${userHint}"`);
    parts.push(
      `YOU MUST follow this request. If user says "pie chart", use chartType: "pie". If user says "bar chart", use chartType: "bar".`,
    );
  }

  return parts.join("\n");
}
