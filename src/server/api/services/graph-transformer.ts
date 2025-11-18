/**
 * AI-Powered Graph Data Transformation Service
 *
 * Uses AI with tools to analyze metric data and transform it
 * into Recharts-compatible format for visualization.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Metric } from "@prisma/client";
import { type CoreMessage, generateText } from "ai";
import { z } from "zod";

import { env } from "@/env";

import {
  type ChartTransformResult,
  type ChartType,
  chartTransformationPrompt,
  toolExecutors,
} from "./chart-ai-tools";

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
  toolCalls?: number;
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

    // Build the prompt with metric context
    const metricContext = buildMetricPrompt(metric, userHint);

    // Define tools (schemas only, execution handled manually)
    // Using 'as any' to bypass AI SDK v5 strict typing issues
    const tools = {
      // Primary tool: Auto-detect data pattern
      detect_pattern: {
        description:
          "RECOMMENDED FIRST STEP: Automatically detect the data format and suggest the best chart type. Identifies time-series, categorical, multi-series patterns.",
        parameters: z.object({
          data: z.any().describe("The data to analyze"),
        }),
      },
      inspect_data: {
        description:
          "Analyze the structure of the metric data with samples and key type analysis.",
        parameters: z.object({
          data: z.any().describe("The data to inspect"),
        }),
      },
      // Flatten nested/complex structures
      flatten_nested: {
        description:
          "Convert nested or complex data structures (like PostHog columns+results) into flat chart-ready format.",
        parameters: z.object({
          data: z.any().describe("The nested data to flatten"),
          options: z
            .object({
              xPath: z.string().optional().describe("Path to x-axis values"),
              yPaths: z
                .array(z.string())
                .optional()
                .describe("Paths to y-axis values"),
              xKey: z
                .string()
                .optional()
                .describe("Key name for x-axis in output"),
              yKeys: z
                .array(z.string())
                .optional()
                .describe("Key names for y-values"),
            })
            .optional()
            .describe("Options for flattening"),
        }),
      },
      // Combine separate arrays
      combine_arrays: {
        description:
          "Combine separate label and value arrays into unified chart data.",
        parameters: z.object({
          labels: z.array(z.string()).describe("Array of labels for x-axis"),
          valueSets: z
            .array(
              z.object({
                key: z.string().describe("Key name for this value series"),
                values: z.array(z.number()).describe("Numeric values"),
              }),
            )
            .describe("One or more sets of numeric values"),
        }),
      },
      // Sort by date
      sort_by_date: {
        description: "Sort chart data chronologically by a date column.",
        parameters: z.object({
          data: z
            .array(z.record(z.union([z.string(), z.number()])))
            .describe("Chart data to sort"),
          dateKey: z.string().describe("The key containing date values"),
        }),
      },
      extract_values: {
        description:
          "Extract numeric values from a specific path in the data. Use dot notation for nested paths.",
        parameters: z.object({
          data: z.any().describe("The source data"),
          path: z.string().describe("JSON path to extract values from"),
        }),
      },
      extract_labels: {
        description:
          "Extract string labels from a specific path. Use for getting x-axis labels.",
        parameters: z.object({
          data: z.any().describe("The source data"),
          path: z.string().describe("JSON path to extract labels from"),
        }),
      },
      get_keys: {
        description:
          "Get the field names (keys) of an object at a specific path with type analysis.",
        parameters: z.object({
          data: z.any().describe("The source data"),
          path: z.string().optional().describe("JSON path to the object"),
        }),
      },
      format_chart_data: {
        description:
          "FINAL STEP: Format extracted data into Recharts-compatible format with colors.",
        parameters: z.object({
          chartType: z
            .enum(["line", "bar", "area", "pie", "radar", "radial", "kpi"])
            .describe("The type of chart to create"),
          chartData: z
            .array(z.record(z.union([z.string(), z.number()])))
            .describe("Array of data points"),
          xAxisKey: z.string().describe("The key to use for x-axis"),
          dataKeys: z
            .array(z.string())
            .describe("Keys containing numeric values"),
          reasoning: z.string().describe("Explanation of chart choice"),
        }),
      },
    } as Record<string, unknown>;

    // Manual tool calling loop
    const messages: CoreMessage[] = [{ role: "user", content: metricContext }];

    let totalToolCalls = 0;
    const maxIterations = 10;

    for (let i = 0; i < maxIterations; i++) {
      const result = await generateText({
        model: openrouter("anthropic/claude-3-haiku-20240307"),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tools: tools as any,
        system: chartTransformationPrompt,
        messages,
      });

      // Check if there are tool calls
      if (!result.toolCalls || result.toolCalls.length === 0) {
        break;
      }

      totalToolCalls += result.toolCalls.length;

      // Process tool calls
      const toolResultMessages: CoreMessage[] = [];

      for (const toolCall of result.toolCalls) {
        // Cast to access properties (AI SDK v5 typing workaround)
        const tc = toolCall as unknown as {
          toolName: string;
          args: unknown;
          toolCallId: string;
        };
        const { toolName, args, toolCallId } = tc;
        let toolResult: unknown;

        // Execute the tool
        switch (toolName) {
          case "detect_pattern":
            toolResult = toolExecutors.detect_pattern(
              (args as { data: unknown }).data,
            );
            break;
          case "inspect_data":
            toolResult = toolExecutors.inspect_data(
              (args as { data: unknown }).data,
            );
            break;
          case "flatten_nested": {
            const flattenArgs = args as {
              data: unknown;
              options?: {
                xPath?: string;
                yPaths?: string[];
                xKey?: string;
                yKeys?: string[];
              };
            };
            toolResult = toolExecutors.flatten_nested(
              flattenArgs.data,
              flattenArgs.options,
            );
            break;
          }
          case "combine_arrays": {
            const combineArgs = args as {
              labels: string[];
              valueSets: { key: string; values: number[] }[];
            };
            toolResult = toolExecutors.combine_arrays(
              combineArgs.labels,
              combineArgs.valueSets,
            );
            break;
          }
          case "sort_by_date": {
            const sortArgs = args as {
              data: Array<Record<string, string | number>>;
              dateKey: string;
            };
            toolResult = toolExecutors.sort_by_date(
              sortArgs.data,
              sortArgs.dateKey,
            );
            break;
          }
          case "extract_values":
            toolResult = toolExecutors.extract_values(
              (args as { data: unknown; path: string }).data,
              (args as { data: unknown; path: string }).path,
            );
            break;
          case "extract_labels":
            toolResult = toolExecutors.extract_labels(
              (args as { data: unknown; path: string }).data,
              (args as { data: unknown; path: string }).path,
            );
            break;
          case "get_keys":
            toolResult = toolExecutors.get_keys(
              (args as { data: unknown; path?: string }).data,
              (args as { data: unknown; path?: string }).path,
            );
            break;
          case "format_chart_data": {
            const formatArgs = args as {
              chartType: ChartType;
              chartData: Array<Record<string, string | number>>;
              xAxisKey: string;
              dataKeys: string[];
              reasoning: string;
            };
            const chartResult = toolExecutors.format_chart_data(
              formatArgs.chartType,
              formatArgs.chartData,
              formatArgs.xAxisKey,
              formatArgs.dataKeys,
              formatArgs.reasoning,
            );
            // Return final result
            return {
              success: true,
              data: chartResult,
              toolCalls: totalToolCalls,
            };
          }
          default:
            toolResult = { error: `Unknown tool: ${toolName}` };
        }

        toolResultMessages.push({
          role: "tool",
          content: [
            {
              type: "tool-result",
              toolCallId,
              toolName,
              result: JSON.stringify(toolResult),
            },
          ],
        } as unknown as CoreMessage);
      }

      // Add assistant response and tool results
      const assistantToolCalls = result.toolCalls.map((tc) => {
        const call = tc as unknown as {
          toolCallId: string;
          toolName: string;
          args: unknown;
        };
        return {
          type: "tool-call" as const,
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: call.args,
        };
      });

      messages.push({
        role: "assistant",
        content: assistantToolCalls,
      } as unknown as CoreMessage);
      messages.push(...toolResultMessages);
    }

    return {
      success: false,
      error: "AI did not produce a valid chart format after max iterations",
      toolCalls: totalToolCalls,
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
  parts.push(`- Type: ${metric.type}`);

  if (metric.description) {
    parts.push(`- Description: ${metric.description}`);
  }

  if (metric.unit) {
    parts.push(`- Unit: ${metric.unit}`);
  }

  if (metric.currentValue !== null) {
    parts.push(`- Current Value: ${metric.currentValue}`);
  }

  if (metric.targetValue !== null) {
    parts.push(`- Target Value: ${metric.targetValue}`);
  }

  parts.push("");
  parts.push(`## Raw Data`);
  parts.push("```json");
  parts.push(JSON.stringify(metric.endpointConfig ?? {}, null, 2));
  parts.push("```");

  if (userHint) {
    parts.push("");
    parts.push(`## User Request`);
    parts.push(userHint);
  }

  parts.push("");
  parts.push(
    `Transform this data into chart format. Use the tools to inspect the data structure, extract values, and format the final chart data.`,
  );

  return parts.join("\n");
}

// ============================================================================
// Fallback: Simple Transformation (No AI)
// ============================================================================

/**
 * Simple fallback transformation when AI is unavailable
 * Provides basic chart data without intelligent analysis
 */
export function transformMetricSimple(metric: Metric): ChartTransformResult {
  const endpointConfig = metric.endpointConfig as Record<
    string,
    unknown
  > | null;

  // Check for PostHog format: results (array of arrays) + columns (array of names)
  if (
    endpointConfig?.results &&
    Array.isArray(endpointConfig.results) &&
    endpointConfig?.columns &&
    Array.isArray(endpointConfig.columns)
  ) {
    const columns = endpointConfig.columns as string[];
    const results = endpointConfig.results as (string | number)[][];

    // Convert array-of-arrays to array-of-objects
    const chartData = results.map((row) => {
      const obj: Record<string, string | number> = {};
      columns.forEach((col, i) => {
        const value = row[i];
        // Parse numbers but keep date strings as strings (for x-axis)
        if (typeof value === "number") {
          obj[col] = value;
        } else if (typeof value === "string") {
          // Check if it looks like a date - keep as string
          const isDateString =
            /^\d{4}-\d{2}-\d{2}/.test(value) ||
            /^\d{2}\/\d{2}\/\d{4}/.test(value) ||
            /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(value);
          if (isDateString) {
            obj[col] = value;
          } else {
            const num = parseFloat(value);
            obj[col] = isNaN(num) ? value : num;
          }
        } else {
          obj[col] = String(value ?? "");
        }
      });
      return obj;
    });

    // Determine x-axis key (first string/date column) and data keys (numeric columns)
    const xAxisKey = columns[0] ?? "index";
    const dataKeys = columns.slice(1);

    // Build chart config
    const chartConfig: Record<string, { label: string; color: string }> = {};
    dataKeys.forEach((key, index) => {
      chartConfig[key] = {
        label: key.charAt(0).toUpperCase() + key.slice(1),
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });

    return {
      chartType: "line",
      chartData,
      chartConfig,
      xAxisKey,
      dataKeys,
      reasoning: `Fallback: Found PostHog results with columns [${columns.join(", ")}], formatted as line chart with ${chartData.length} data points`,
    };
  }

  // Check for columnData array (common pattern)
  if (endpointConfig?.columnData && Array.isArray(endpointConfig.columnData)) {
    const values = endpointConfig.columnData.map((v, i) => ({
      index: `Point ${i + 1}`,
      value: typeof v === "number" ? v : parseFloat(String(v)) || 0,
    }));

    return {
      chartType: "line",
      chartData: values,
      chartConfig: {
        value: {
          label: metric.name,
          color: "var(--chart-1)",
        },
      },
      xAxisKey: "index",
      dataKeys: ["value"],
      reasoning: "Fallback: Found columnData array, formatted as line chart",
    };
  }

  // Check for numeric fields at root level
  if (endpointConfig && typeof endpointConfig === "object") {
    const numericEntries = Object.entries(endpointConfig).filter(
      ([, value]) =>
        typeof value === "number" ||
        (typeof value === "string" && !isNaN(parseFloat(value))),
    );

    if (numericEntries.length > 0) {
      const chartData = numericEntries.map(([key, value], index) => ({
        category: key,
        value: typeof value === "number" ? value : parseFloat(String(value)),
        fill: `var(--chart-${(index % 5) + 1})`,
      }));

      const chartConfig: Record<string, { label: string; color: string }> = {};
      numericEntries.forEach(([key], index) => {
        chartConfig[key.toLowerCase()] = {
          label: key,
          color: `var(--chart-${(index % 5) + 1})`,
        };
      });

      return {
        chartType: "bar",
        chartData,
        chartConfig,
        xAxisKey: "category",
        dataKeys: ["value"],
        reasoning: "Fallback: Found numeric fields, formatted as bar chart",
      };
    }
  }

  // Last resort: single current value
  return {
    chartType: "kpi",
    chartData: [
      {
        label: metric.name,
        value: metric.currentValue ?? 0,
      },
    ],
    chartConfig: {
      value: {
        label: metric.name,
        color: "var(--chart-1)",
      },
    },
    xAxisKey: "label",
    dataKeys: ["value"],
    reasoning: "Fallback: Using current value as KPI",
  };
}
