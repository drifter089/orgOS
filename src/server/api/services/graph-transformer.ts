/**
 * AI-Powered Graph Data Transformation Service
 *
 * Uses AI with tools to analyze metric data and transform it
 * into Recharts-compatible format for visualization.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { Metric } from "@prisma/client";
import { generateText } from "ai";

import { env } from "@/env";

import { type ChartTransformResult, type ChartType } from "./chart-ai-tools";

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

    // Build the direct transformation prompt
    const systemPrompt = `You are a data transformation expert. Transform the provided metric data into Recharts-compatible chart format.

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "chartType": "line" | "bar" | "area" | "pie" | "radar" | "radial" | "kpi",
  "chartData": [{"label": "...", "value": 123}, ...],
  "chartConfig": {"value": {"label": "Label", "color": "var(--chart-1)"}},
  "xAxisKey": "label",
  "dataKeys": ["value"],
  "reasoning": "Brief explanation of transformation"
}

## Chart Type Selection Rules:
- PIE/RADIAL: Use for distributions, percentages, part-to-whole (≤8 categories)
- BAR: Use for comparisons, rankings, categories with values
- LINE/AREA: Use for time-series trends (many data points over time)
- RADAR: Use for multi-variable comparison
- KPI: Use only for single scalar values

## Data Transformation Rules:
1. For Google Sheets with "values" array: first row is headers, rest is data
2. Convert all string numbers to actual numbers
3. Use meaningful keys from headers (not generic names)
4. For pie charts: use "name" and "value" keys, add "fill" with colors
5. Colors: var(--chart-1) through var(--chart-5)

## IMPORTANT:
- If user requests a specific chart type (pie, bar, etc.), USE THAT TYPE
- For categorical data with few items, prefer BAR or PIE over LINE
- Always return valid JSON, no markdown code blocks`;

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
      model: openrouter("anthropic/claude-sonnet-4-20250514"),
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
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

    const chartResult = JSON.parse(jsonStr) as {
      chartType: ChartType;
      chartData: Array<Record<string, string | number>>;
      chartConfig: Record<string, { label: string; color: string }>;
      xAxisKey: string;
      dataKeys: string[];
      reasoning: string;
    };

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
          color: `var(--chart-${(index % 5) + 1})`,
        };
      });
    }

    return {
      success: true,
      data: chartResult,
      toolCalls: 0,
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
    `Transform this data into chart format. Extract values and format the final chart data.`,
  );
  parts.push("");
  parts.push(
    `For Google Sheets data with "values" array, the first row is headers and subsequent rows are data. Extract columns by index and create proper chart data with meaningful labels.`,
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

  // Check for Google Sheets format: { values: [[headers], [row1], [row2], ...] }
  if (
    endpointConfig?.values &&
    Array.isArray(endpointConfig.values) &&
    endpointConfig.values.length > 1
  ) {
    const values = endpointConfig.values as (string | number)[][];
    const headers = values[0] as string[];
    const dataRows = values.slice(1);

    // Find date/label column (first string column) and numeric columns
    let labelIndex = 0;
    const numericIndices: number[] = [];

    // Analyze first data row to determine column types
    const firstRow = dataRows[0];
    if (firstRow) {
      headers.forEach((_, i) => {
        const value = firstRow[i];
        const numValue = parseFloat(String(value));
        if (
          !isNaN(numValue) &&
          !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(String(value))
        ) {
          numericIndices.push(i);
        }
      });

      // If no numeric columns found, try to find Amount/Value columns by name
      if (numericIndices.length === 0) {
        headers.forEach((header, i) => {
          if (
            /amount|value|price|cost|total|count|qty|quantity/i.test(header)
          ) {
            numericIndices.push(i);
          }
        });
      }
    }

    // Use first column as label, or find Date/Category column
    const dateIndex = headers.findIndex((h) =>
      /date|time|day|month|year/i.test(h),
    );
    const categoryIndex = headers.findIndex((h) =>
      /category|type|name|item/i.test(h),
    );
    labelIndex =
      dateIndex >= 0 ? dateIndex : categoryIndex >= 0 ? categoryIndex : 0;

    // Remove label column from numeric indices if present
    const dataIndices = numericIndices.filter((i) => i !== labelIndex);

    // If still no data columns, use all columns except label
    if (dataIndices.length === 0) {
      headers.forEach((_, i) => {
        if (i !== labelIndex) dataIndices.push(i);
      });
    }

    // Build chart data
    const chartData = dataRows.map((row) => {
      const obj: Record<string, string | number> = {};
      obj[headers[labelIndex] ?? "label"] = String(row[labelIndex] ?? "");

      dataIndices.forEach((i) => {
        const value = row[i];
        const numValue = parseFloat(String(value).replace(/[,$]/g, ""));
        obj[headers[i] ?? `col${i}`] = isNaN(numValue) ? 0 : numValue;
      });

      return obj;
    });

    // Build chart config
    const xAxisKey = headers[labelIndex] ?? "label";
    const dataKeys = dataIndices.map((i) => headers[i] ?? `col${i}`);
    const chartConfig: Record<string, { label: string; color: string }> = {};

    dataKeys.forEach((key, index) => {
      chartConfig[key] = {
        label: key,
        color: `var(--chart-${(index % 5) + 1})`,
      };
    });

    // Determine chart type based on data characteristics
    const hasDateLabels = /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(
      String(dataRows[0]?.[labelIndex] ?? ""),
    );
    const itemCount = chartData.length;
    const isCategorical = !hasDateLabels && itemCount <= 10;

    let chartType: "line" | "bar" | "area" | "pie" = "bar";
    if (hasDateLabels && itemCount > 5) {
      chartType = "line";
    } else if (isCategorical && dataKeys.length === 1 && itemCount <= 6) {
      chartType = "pie";
    }

    return {
      chartType,
      chartData,
      chartConfig,
      xAxisKey,
      dataKeys,
      reasoning: `Fallback: Google Sheets data with ${headers.length} columns and ${dataRows.length} rows. Using ${xAxisKey} as x-axis and ${dataKeys.join(", ")} as data series.`,
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
