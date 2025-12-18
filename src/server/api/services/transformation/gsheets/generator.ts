/**
 * Google Sheets AI Code Generator
 *
 * Generates transformer code specifically for Google Sheets data.
 * Uses dedicated prompts that understand 2D array structure.
 */
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";

import { env } from "@/env";

import { cleanGeneratedCode, safeStringifyForPrompt } from "../utils";
import { GSHEETS_CHART_PROMPT, GSHEETS_DATA_INGESTION_PROMPT } from "./prompts";

interface GenerateGSheetsDataIngestionInput {
  templateId: string;
  sampleApiResponse: unknown;
  sheetName: string;
  dataRange?: string; // A1 notation like "B3:E20"
}

interface GenerateGSheetsChartInput {
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
}

interface GeneratedCode {
  code: string;
  reasoning: string;
}

function getOpenRouterClient() {
  if (!env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not configured");
  }
  return createOpenRouter({
    apiKey: env.OPENROUTER_API_KEY,
  });
}

/**
 * Generate DataIngestionTransformer code for Google Sheets
 */
export async function generateGSheetsDataIngestionCode(
  input: GenerateGSheetsDataIngestionInput,
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  const sanitizedResponse = safeStringifyForPrompt(input.sampleApiResponse);

  // Extract preview of the data structure for the prompt
  const response = input.sampleApiResponse as { values?: string[][] };
  const values = response?.values ?? [];
  const previewRows = values.slice(0, 10);
  const totalRows = values.length;
  const totalCols = values[0]?.length ?? 0;

  const userPrompt = `Google Sheets Data Analysis

Sheet: ${input.sheetName}
${input.dataRange ? `Selected Range: ${input.dataRange}` : "Range: Entire sheet"}
Total Rows: ${totalRows}
Total Columns: ${totalCols}

Data Preview (first 10 rows):
${JSON.stringify(previewRows, null, 2)}

Full API Response structure:
${sanitizedResponse}

Analyze this spreadsheet data and generate a transformer that:
1. Detects if first row is headers
2. Detects if first column is labels
3. Identifies numeric value columns
4. Creates appropriate DataPoints with dimensions

Generate the JavaScript transform function.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: GSHEETS_DATA_INGESTION_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Generated Google Sheets transformer for ${input.sheetName}. Detected ${totalRows} rows × ${totalCols} columns.`,
  };
}

/**
 * Regenerate DataIngestionTransformer code for Google Sheets after failure
 */
export async function regenerateGSheetsDataIngestionCode(
  input: GenerateGSheetsDataIngestionInput & {
    previousCode?: string;
    error?: string;
  },
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  const sanitizedResponse = safeStringifyForPrompt(input.sampleApiResponse);

  const response = input.sampleApiResponse as { values?: string[][] };
  const values = response?.values ?? [];
  const previewRows = values.slice(0, 10);

  let userPrompt = `Google Sheets Data - REGENERATION NEEDED

Sheet: ${input.sheetName}
${input.dataRange ? `Selected Range: ${input.dataRange}` : "Range: Entire sheet"}

Data Preview (first 10 rows):
${JSON.stringify(previewRows, null, 2)}

Full API Response:
${sanitizedResponse}`;

  if (input.previousCode) {
    userPrompt += `

Previous code that FAILED:
${input.previousCode}`;
  }

  if (input.error) {
    userPrompt += `

Error message:
${input.error}

Fix the error and ensure:
- Proper null/undefined handling
- parseFloat for all numeric conversions
- Check for NaN before including values
- Unique timestamps for each DataPoint`;
  }

  userPrompt += "\n\nGenerate a FIXED JavaScript transform function.";

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: GSHEETS_DATA_INGESTION_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.2,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Regenerated Google Sheets transformer after failure.`,
  };
}

/**
 * Generate ChartTransformer code for Google Sheets data
 */
export async function generateGSheetsChartCode(
  input: GenerateGSheetsChartInput,
): Promise<GeneratedCode> {
  const openrouter = getOpenRouterClient();

  // Sample data points for AI context
  const samplePoints = input.sampleDataPoints.slice(0, 30).map((dp) => ({
    timestamp: dp.timestamp.toISOString(),
    value: dp.value,
    dimensions: dp.dimensions,
  }));

  // Analyze dimensions to help AI understand the data structure
  const allDimensions = input.sampleDataPoints
    .map((dp) => dp.dimensions)
    .filter(Boolean);

  const hasLabels = allDimensions.some((d) => d && "label" in d);
  const hasSeries = allDimensions.some((d) => d && "series" in d);
  const uniqueLabels = [
    ...new Set(allDimensions.map((d) => d?.label).filter(Boolean)),
  ];
  const uniqueSeries = [
    ...new Set(allDimensions.map((d) => d?.series).filter(Boolean)),
  ];

  let userPrompt = `Google Sheets Chart Generation

Metric: ${input.metricName}
Description: ${input.metricDescription}

Data Analysis:
- Total data points: ${input.sampleDataPoints.length}
- Has labels (dimensions.label): ${hasLabels} ${hasLabels ? `(${uniqueLabels.length} unique: ${uniqueLabels.slice(0, 5).join(", ")}${uniqueLabels.length > 5 ? "..." : ""})` : ""}
- Has series (dimensions.series): ${hasSeries} ${hasSeries ? `(${uniqueSeries.length} unique: ${uniqueSeries.join(", ")})` : ""}

Sample DataPoints (first ${samplePoints.length}):
${JSON.stringify(samplePoints, null, 2)}

User preferences:
- Suggested chartType: ${input.chartType} (but choose best fit for data)
- cadence: ${input.cadence}`;

  if (input.userPrompt) {
    userPrompt += `

User request: "${input.userPrompt}"`;
  }

  userPrompt += `

Based on the data structure, choose the best chart type:
- BAR/STACKED BAR for categorical comparisons
- PIE for proportions (if few categories)
- LINE/AREA for time-series
- RADAR for multi-dimensional comparison

Generate the JavaScript transform function.`;

  const result = await generateText({
    model: openrouter("anthropic/claude-sonnet-4"),
    system: GSHEETS_CHART_PROMPT,
    prompt: userPrompt,
    maxOutputTokens: 4000,
    temperature: 0.1,
  });

  return {
    code: cleanGeneratedCode(result.text),
    reasoning: `Generated chart for Google Sheets metric "${input.metricName}". Data has ${hasLabels ? "labels" : "no labels"}, ${hasSeries ? `${uniqueSeries.length} series` : "single series"}.`,
  };
}
