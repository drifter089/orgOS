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

  // Check for numeric fields at root level (like GitHub languages)
  if (
    endpointConfig &&
    typeof endpointConfig === "object" &&
    !Array.isArray(endpointConfig)
  ) {
    const numericEntries = Object.entries(endpointConfig).filter(
      ([key, value]) =>
        // Skip nested objects/arrays
        (typeof value === "number" ||
          (typeof value === "string" && !isNaN(parseFloat(value)))) &&
        !["all", "owner", "workflow_runs"].includes(key),
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
        chartType: numericEntries.length <= 6 ? "pie" : "bar",
        chartData,
        chartConfig,
        xAxisKey: "category",
        dataKeys: ["value"],
        reasoning: `Fallback: Found ${numericEntries.length} numeric fields, formatted as ${numericEntries.length <= 6 ? "pie" : "bar"} chart`,
      };
    }

    // Check for GitHub participation format { all: [...], owner: [...] }
    if (
      "all" in endpointConfig &&
      "owner" in endpointConfig &&
      Array.isArray(endpointConfig.all) &&
      Array.isArray(endpointConfig.owner)
    ) {
      const allData = endpointConfig.all as number[];
      const ownerData = endpointConfig.owner as number[];

      const chartData = allData.map((allVal, i) => ({
        week: `Week ${i + 1}`,
        all: allVal,
        owner: ownerData[i] ?? 0,
      }));

      return {
        chartType: "area",
        chartData,
        chartConfig: {
          all: { label: "All Contributors", color: "var(--chart-1)" },
          owner: { label: "Owner", color: "var(--chart-2)" },
        },
        xAxisKey: "week",
        dataKeys: ["all", "owner"],
        reasoning:
          "Fallback: Found GitHub participation data (52 weeks), formatted as area chart",
      };
    }

    // Check for workflow_runs wrapper
    if (
      "workflow_runs" in endpointConfig &&
      Array.isArray(endpointConfig.workflow_runs)
    ) {
      const runs = endpointConfig.workflow_runs as Array<{
        conclusion?: string;
        created_at?: string;
        name?: string;
      }>;

      // Group by conclusion for success rate
      const conclusionCounts = runs.reduce<Record<string, number>>(
        (acc, run) => {
          const conclusion = run.conclusion ?? "pending";
          acc[conclusion] = (acc[conclusion] ?? 0) + 1;
          return acc;
        },
        {},
      );

      const chartData = Object.entries(conclusionCounts).map(
        ([conclusion, count], index) => ({
          status: conclusion,
          count,
          fill: `var(--chart-${(index % 5) + 1})`,
        }),
      );

      const chartConfig: Record<string, { label: string; color: string }> = {};
      chartData.forEach((item, index) => {
        chartConfig[item.status] = {
          label: item.status.charAt(0).toUpperCase() + item.status.slice(1),
          color: `var(--chart-${(index % 5) + 1})`,
        };
      });

      return {
        chartType: "pie",
        chartData,
        chartConfig,
        xAxisKey: "status",
        dataKeys: ["count"],
        reasoning: `Fallback: Found ${runs.length} workflow runs, grouped by conclusion status`,
      };
    }
  }

  // Check for array of GitHub objects (PRs, issues, commits)
  if (Array.isArray(endpointConfig) && endpointConfig.length > 0) {
    const firstItem = endpointConfig[0] as Record<string, unknown>;

    // GitHub PR/Issue format (has created_at, state, title)
    if ("created_at" in firstItem && "state" in firstItem) {
      // Group by date
      const dateCounts = (
        endpointConfig as Array<{ created_at: string }>
      ).reduce<Record<string, number>>((acc, item) => {
        const date = item.created_at.split("T")[0] ?? "unknown";
        acc[date] = (acc[date] ?? 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(dateCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date,
          count,
        }));

      return {
        chartType: "line",
        chartData,
        chartConfig: {
          count: { label: "Count", color: "var(--chart-1)" },
        },
        xAxisKey: "date",
        dataKeys: ["count"],
        reasoning: `Fallback: Found ${endpointConfig.length} GitHub items with dates, grouped by date for velocity chart`,
      };
    }

    // GitHub commit format (has sha, commit.author.date)
    if ("sha" in firstItem && "commit" in firstItem) {
      const commits = endpointConfig as Array<{
        commit: { author: { date: string; name: string } };
      }>;

      const dateCounts = commits.reduce<Record<string, number>>((acc, item) => {
        const date = item.commit.author.date.split("T")[0] ?? "unknown";
        acc[date] = (acc[date] ?? 0) + 1;
        return acc;
      }, {});

      const chartData = Object.entries(dateCounts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({
          date,
          count,
        }));

      return {
        chartType: "line",
        chartData,
        chartConfig: {
          count: { label: "Commits", color: "var(--chart-1)" },
        },
        xAxisKey: "date",
        dataKeys: ["count"],
        reasoning: `Fallback: Found ${endpointConfig.length} commits, grouped by date`,
      };
    }

    // GitHub contributor stats format (has author.login, total)
    if ("author" in firstItem && "total" in firstItem) {
      const contributors = endpointConfig as Array<{
        author: { login: string };
        total: number;
      }>;

      const chartData = contributors
        .sort((a, b) => b.total - a.total)
        .slice(0, 10)
        .map((item, index) => ({
          contributor: item.author.login,
          commits: item.total,
          fill: `var(--chart-${(index % 5) + 1})`,
        }));

      const chartConfig: Record<string, { label: string; color: string }> = {};
      chartData.forEach((item, index) => {
        chartConfig[item.contributor] = {
          label: item.contributor,
          color: `var(--chart-${(index % 5) + 1})`,
        };
      });

      return {
        chartType: "bar",
        chartData,
        chartConfig,
        xAxisKey: "contributor",
        dataKeys: ["commits"],
        reasoning: `Fallback: Found ${contributors.length} contributors, showing top 10 by commits`,
      };
    }

    // GitHub commit activity format (has week timestamp, total, days)
    if ("week" in firstItem && "total" in firstItem && "days" in firstItem) {
      const weeks = endpointConfig as Array<{
        week: number;
        total: number;
      }>;

      const chartData = weeks.map((item) => ({
        week:
          new Date(item.week * 1000).toISOString().split("T")[0] ?? "unknown",
        commits: item.total,
      }));

      return {
        chartType: "area",
        chartData,
        chartConfig: {
          commits: { label: "Commits", color: "var(--chart-1)" },
        },
        xAxisKey: "week",
        dataKeys: ["commits"],
        reasoning: `Fallback: Found ${weeks.length} weeks of commit activity`,
      };
    }

    // GitHub code frequency format (array of [timestamp, additions, deletions])
    if (Array.isArray(firstItem) && firstItem.length === 3) {
      const weeks = endpointConfig as Array<[number, number, number]>;

      const chartData = weeks.map(([timestamp, additions, deletions]) => ({
        week:
          new Date(timestamp * 1000).toISOString().split("T")[0] ?? "unknown",
        additions,
        deletions: Math.abs(deletions),
      }));

      return {
        chartType: "bar",
        chartData,
        chartConfig: {
          additions: { label: "Additions", color: "var(--chart-1)" },
          deletions: { label: "Deletions", color: "var(--chart-2)" },
        },
        xAxisKey: "week",
        dataKeys: ["additions", "deletions"],
        reasoning: `Fallback: Found ${weeks.length} weeks of code frequency data`,
      };
    }

    // GitHub punch card format (array of [day, hour, count])
    if (
      Array.isArray(firstItem) &&
      firstItem.length === 3 &&
      typeof firstItem[0] === "number" &&
      typeof firstItem[1] === "number"
    ) {
      const punchCard = endpointConfig as Array<[number, number, number]>;

      // Group by day for simpler visualization
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dayCounts = punchCard.reduce<Record<string, number>>(
        (acc, [day, , count]) => {
          const dayName = dayNames[day] ?? `Day ${day}`;
          acc[dayName] = (acc[dayName] ?? 0) + count;
          return acc;
        },
        {},
      );

      const chartData = dayNames.map((day, index) => ({
        day,
        commits: dayCounts[day] ?? 0,
        fill: `var(--chart-${(index % 5) + 1})`,
      }));

      return {
        chartType: "bar",
        chartData,
        chartConfig: {
          commits: { label: "Commits", color: "var(--chart-1)" },
        },
        xAxisKey: "day",
        dataKeys: ["commits"],
        reasoning: "Fallback: Found punch card data, grouped by day of week",
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
