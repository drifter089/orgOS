#!/usr/bin/env node
/**
 * Metrics Pipeline Analysis & Testing CLI
 *
 * Commands:
 *   analyze [metricName]       - Analyze existing metrics (default)
 *   prompt <templateId>        - Show extraction prompt for template
 *   export <metricName>        - Export data for offline analysis
 *
 * Examples:
 *   node scripts/analyze-metrics-pipeline.mjs                    # All metrics
 *   node scripts/analyze-metrics-pipeline.mjs analyze linear     # Filter by name
 *   node scripts/analyze-metrics-pipeline.mjs prompt linear-user-issues
 *   node scripts/analyze-metrics-pipeline.mjs export linear
 */

import { PrismaClient } from "@prisma/client";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();
const __dirname = dirname(fileURLToPath(import.meta.url));

// =============================================================================
// Template Registry Loader (loads from TypeScript files)
// =============================================================================

async function loadTemplates() {
  // Dynamic import of integration files
  // Note: This requires tsx or similar to run TypeScript
  try {
    const integrations = await Promise.all([
      import("../src/lib/integrations/linear.js").catch(() => null),
      import("../src/lib/integrations/github.js").catch(() => null),
      import("../src/lib/integrations/youtube.js").catch(() => null),
      import("../src/lib/integrations/posthog.js").catch(() => null),
      import("../src/lib/integrations/google-sheets.js").catch(() => null),
    ]);

    const templates = [];
    for (const integration of integrations) {
      if (integration?.templates) {
        templates.push(...integration.templates);
      }
    }
    return templates;
  } catch (error) {
    console.warn(
      "Could not load templates from source files. Using database only.",
    );
    return [];
  }
}

function getTemplateById(templates, templateId) {
  return templates.find((t) => t.templateId === templateId);
}

// =============================================================================
// Command: analyze (existing functionality, enhanced)
// =============================================================================

async function analyzeMetric(metric, ingestionTransformer, templates) {
  const template = getTemplateById(templates, metric.templateId);

  const output = {
    metric: {
      id: metric.id,
      name: metric.name,
      templateId: metric.templateId,
      endpointConfig: metric.endpointConfig,
      pollFrequency: metric.pollFrequency,
      lastFetchedAt: metric.lastFetchedAt,
      lastError: metric.lastError,
    },
    goal: metric.goal
      ? {
          type: metric.goal.goalType,
          targetValue: metric.goal.targetValue,
        }
      : null,
    extractionPrompt: template?.extractionPrompt ?? null,
    ingestionTransformer: ingestionTransformer
      ? {
          templateId: ingestionTransformer.templateId,
          valueLabel: ingestionTransformer.valueLabel,
          dataDescription: ingestionTransformer.dataDescription,
          extractionPromptUsed: ingestionTransformer.extractionPromptUsed,
          transformerCode: ingestionTransformer.transformerCode,
        }
      : null,
    apiAnalysis: null,
    dataPointsAnalysis: null,
    informationLossAnalysis: null,
  };

  // Analyze API Response
  if (metric.apiLogs && metric.apiLogs.length > 0) {
    const latestLog = metric.apiLogs[0];
    const raw = latestLog.rawResponse;

    output.apiAnalysis = {
      endpoint: latestLog.endpoint,
      fetchedAt: latestLog.fetchedAt,
      success: latestLog.success,
      error: latestLog.error,
      responseStructure: analyzeResponseStructure(raw),
      sampleData: extractSampleData(raw),
    };
  }

  // Analyze Stored DataPoints
  if (metric.dataPoints && metric.dataPoints.length > 0) {
    const points = metric.dataPoints;

    // Get all unique dimension keys
    const allDimKeys = new Set();
    points.forEach((p) => {
      if (p.dimensions) {
        Object.keys(p.dimensions).forEach((k) => allDimKeys.add(k));
      }
    });

    output.dataPointsAnalysis = {
      totalPoints: points.length,
      dateRange: {
        oldest: points[points.length - 1]?.timestamp,
        newest: points[0]?.timestamp,
      },
      valueStats: {
        min: Math.min(...points.map((p) => p.value)),
        max: Math.max(...points.map((p) => p.value)),
        avg: points.reduce((sum, p) => sum + p.value, 0) / points.length,
      },
      dimensionKeys: Array.from(allDimKeys),
      samplePoints: points.slice(0, 5).map((p) => ({
        date: p.timestamp.toISOString().split("T")[0],
        value: p.value,
        dimensions: p.dimensions,
      })),
    };
  }

  // Analyze Information Loss
  output.informationLossAnalysis = analyzeInformationLoss(
    output.apiAnalysis,
    output.dataPointsAnalysis,
    output.ingestionTransformer,
    output.extractionPrompt,
  );

  return output;
}

function analyzeResponseStructure(raw) {
  if (!raw) return null;

  // Handle different API response formats
  if (raw.data?.issues?.nodes) {
    // Linear GraphQL format (user issues)
    const nodes = raw.data.issues.nodes;
    const firstNode = nodes[0];
    return {
      type: "linear-graphql",
      path: "data.issues.nodes[]",
      totalRecords: nodes.length,
      availableFields: firstNode ? Object.keys(firstNode) : [],
      nestedFields: firstNode ? extractNestedFields(firstNode) : {},
    };
  }

  if (raw.data?.project?.issues?.nodes) {
    // Linear GraphQL format (project issues)
    const nodes = raw.data.project.issues.nodes;
    const firstNode = nodes[0];
    return {
      type: "linear-graphql",
      path: "data.project.issues.nodes[]",
      totalRecords: nodes.length,
      availableFields: firstNode ? Object.keys(firstNode) : [],
      nestedFields: firstNode ? extractNestedFields(firstNode) : {},
    };
  }

  if (raw.data?.team?.issues?.nodes) {
    // Linear GraphQL format (team issues)
    const nodes = raw.data.team.issues.nodes;
    const firstNode = nodes[0];
    return {
      type: "linear-graphql",
      path: "data.team.issues.nodes[]",
      totalRecords: nodes.length,
      availableFields: firstNode ? Object.keys(firstNode) : [],
      nestedFields: firstNode ? extractNestedFields(firstNode) : {},
    };
  }

  if (raw.results && Array.isArray(raw.results)) {
    // PostHog format
    return {
      type: "posthog-query",
      totalRecords: raw.results.length,
      columns: raw.columns || [],
      types: raw.types || [],
    };
  }

  if (Array.isArray(raw)) {
    // GitHub array format
    const first = raw[0];
    return {
      type: "array",
      totalRecords: raw.length,
      itemStructure: Array.isArray(first) ? "tuple" : typeof first,
      sampleItem: first,
    };
  }

  return {
    type: "unknown",
    keys: Object.keys(raw),
  };
}

function extractNestedFields(obj) {
  const nested = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      nested[key] = Object.keys(value);
    }
  }
  return nested;
}

function extractSampleData(raw) {
  if (!raw) return null;

  // Linear (various paths)
  if (raw.data?.issues?.nodes) {
    return {
      format: "linear",
      samples: raw.data.issues.nodes.slice(0, 3),
    };
  }
  if (raw.data?.project?.issues?.nodes) {
    return {
      format: "linear",
      samples: raw.data.project.issues.nodes.slice(0, 3),
    };
  }
  if (raw.data?.team?.issues?.nodes) {
    return {
      format: "linear",
      samples: raw.data.team.issues.nodes.slice(0, 3),
    };
  }

  // PostHog
  if (raw.results && Array.isArray(raw.results)) {
    return {
      format: "posthog",
      columns: raw.columns,
      samples: raw.results.slice(0, 5),
    };
  }

  // GitHub array
  if (Array.isArray(raw)) {
    return {
      format: "array",
      samples: raw.slice(0, 5),
    };
  }

  return { format: "unknown", raw: JSON.stringify(raw).slice(0, 500) };
}

function analyzeInformationLoss(
  apiAnalysis,
  dataPointsAnalysis,
  transformer,
  extractionPrompt,
) {
  const issues = [];
  const suggestions = [];

  if (!apiAnalysis || !dataPointsAnalysis) {
    return { issues: ["Insufficient data for analysis"], suggestions: [] };
  }

  const structure = apiAnalysis.responseStructure;

  // Check if extraction prompt is being used
  if (extractionPrompt && !transformer?.extractionPromptUsed) {
    issues.push(
      "Template has extractionPrompt but transformer was generated without it",
    );
    suggestions.push(
      "Delete transformer and regenerate to use the extraction prompt",
    );
  }

  // Linear-specific analysis
  if (structure?.type === "linear-graphql") {
    const availableFields = structure.availableFields || [];
    const storedDims = dataPointsAnalysis.dimensionKeys || [];

    // Check for date field usage
    if (
      availableFields.includes("completedAt") &&
      availableFields.includes("createdAt")
    ) {
      if (
        transformer?.transformerCode?.includes("createdAt") &&
        !transformer?.transformerCode?.includes("completedAt")
      ) {
        issues.push(
          "CRITICAL: Transformer uses createdAt - should use completedAt for completed issues",
        );
        suggestions.push(
          'Update extractionPrompt to specify: TIMESTAMP: Use "completedAt"',
        );
      }
    }

    // Check for missing useful fields
    const usefulFields = ["estimate", "priority", "project", "team", "labels"];
    usefulFields.forEach((field) => {
      if (availableFields.includes(field) && !storedDims.includes(field)) {
        const isAggregated = transformer?.transformerCode?.includes(field);
        if (!isAggregated) {
          suggestions.push(
            `Field "${field}" available in API but not stored in dimensions`,
          );
        }
      }
    });

    // Check nested fields
    const nestedFields = structure.nestedFields || {};
    if (nestedFields.state) {
      suggestions.push(
        "State object has fields: " + nestedFields.state.join(", "),
      );
    }
    if (nestedFields.team) {
      suggestions.push(
        "Team object has fields: " +
          nestedFields.team.join(", ") +
          " - could group by team",
      );
    }
  }

  // PostHog-specific analysis
  if (structure?.type === "posthog-query") {
    if (dataPointsAnalysis.dimensionKeys.length === 0) {
      suggestions.push(
        "PostHog data has no dimensions - consider adding breakdown by property",
      );
    }
  }

  // GitHub-specific analysis
  if (structure?.type === "array" && structure?.itemStructure === "tuple") {
    suggestions.push(
      "GitHub returns weekly aggregates - daily granularity not available from this endpoint",
    );
  }

  return { issues, suggestions };
}

async function analyzeCommand(filterName, templates) {
  console.log("=".repeat(80));
  console.log("METRICS PIPELINE ANALYSIS");
  console.log("Generated for debugging and improving extraction prompts");
  console.log("=".repeat(80));
  console.log("");

  // Fetch all metrics with related data
  let metrics = await prisma.metric.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      apiLogs: { orderBy: { fetchedAt: "desc" }, take: 1 },
      dataPoints: { orderBy: { timestamp: "desc" }, take: 20 },
      goal: true,
    },
  });

  // Filter by name if provided
  if (filterName) {
    metrics = metrics.filter((m) =>
      m.name.toLowerCase().includes(filterName.toLowerCase()),
    );
    console.log('Filtered to metrics containing: "' + filterName + '"');
    console.log("");
  }

  // Fetch all ingestion transformers
  const transformers = await prisma.dataIngestionTransformer.findMany();
  const transformerMap = new Map(transformers.map((t) => [t.templateId, t]));

  console.log("Found " + metrics.length + " metric(s) to analyze");
  console.log("");

  for (const metric of metrics) {
    const transformer = transformerMap.get(metric.templateId);
    const analysis = await analyzeMetric(metric, transformer, templates);

    console.log("");
    console.log("#".repeat(80));
    console.log("# METRIC: " + analysis.metric.name);
    console.log("# Template: " + analysis.metric.templateId);
    console.log("#".repeat(80));
    console.log("");

    // Metric Config
    console.log("## METRIC CONFIGURATION");
    console.log(JSON.stringify(analysis.metric, null, 2));
    console.log("");

    // Goal
    if (analysis.goal) {
      console.log("## GOAL");
      console.log(JSON.stringify(analysis.goal, null, 2));
      console.log("");
    }

    // Extraction Prompt (from template)
    if (analysis.extractionPrompt) {
      console.log("## EXTRACTION PROMPT (from template)");
      console.log("```");
      console.log(analysis.extractionPrompt.trim());
      console.log("```");
      console.log("");
    }

    // Ingestion Transformer
    if (analysis.ingestionTransformer) {
      console.log("## DATA INGESTION TRANSFORMER");
      console.log("Value Label: " + analysis.ingestionTransformer.valueLabel);
      console.log(
        "Data Description: " + analysis.ingestionTransformer.dataDescription,
      );
      if (analysis.ingestionTransformer.extractionPromptUsed) {
        console.log("Extraction Prompt Used: YES");
      } else {
        console.log("Extraction Prompt Used: NO (generated without prompt)");
      }
      console.log("");
      console.log("### Transformer Code:");
      console.log("```javascript");
      console.log(analysis.ingestionTransformer.transformerCode);
      console.log("```");
      console.log("");
    }

    // API Analysis
    if (analysis.apiAnalysis) {
      console.log("## API RESPONSE ANALYSIS");
      console.log("Endpoint: " + analysis.apiAnalysis.endpoint);
      console.log("Fetched: " + analysis.apiAnalysis.fetchedAt);
      console.log("");
      console.log("### Response Structure:");
      console.log(JSON.stringify(analysis.apiAnalysis.responseStructure, null, 2));
      console.log("");
      console.log("### Sample Data:");
      console.log(JSON.stringify(analysis.apiAnalysis.sampleData, null, 2));
      console.log("");
    }

    // DataPoints Analysis
    if (analysis.dataPointsAnalysis) {
      console.log("## STORED DATA POINTS");
      console.log("Total Points: " + analysis.dataPointsAnalysis.totalPoints);
      console.log(
        "Date Range: " +
          analysis.dataPointsAnalysis.dateRange.oldest +
          " to " +
          analysis.dataPointsAnalysis.dateRange.newest,
      );
      console.log(
        "Value Stats: min=" +
          analysis.dataPointsAnalysis.valueStats.min +
          ", max=" +
          analysis.dataPointsAnalysis.valueStats.max +
          ", avg=" +
          analysis.dataPointsAnalysis.valueStats.avg.toFixed(2),
      );
      console.log(
        "Dimension Keys: " +
          JSON.stringify(analysis.dataPointsAnalysis.dimensionKeys),
      );
      console.log("");
      console.log("### Sample Points:");
      analysis.dataPointsAnalysis.samplePoints.forEach((p) => {
        console.log(
          "  " +
            p.date +
            ": value=" +
            p.value +
            ", dims=" +
            JSON.stringify(p.dimensions),
        );
      });
      console.log("");
    }

    // Information Loss Analysis
    console.log("## INFORMATION LOSS ANALYSIS");
    if (analysis.informationLossAnalysis.issues.length > 0) {
      console.log("### Issues Found:");
      analysis.informationLossAnalysis.issues.forEach((issue) => {
        console.log("  !! " + issue);
      });
      console.log("");
    }
    if (analysis.informationLossAnalysis.suggestions.length > 0) {
      console.log("### Suggestions:");
      analysis.informationLossAnalysis.suggestions.forEach((sug) => {
        console.log("  -> " + sug);
      });
      console.log("");
    }
    if (
      analysis.informationLossAnalysis.issues.length === 0 &&
      analysis.informationLossAnalysis.suggestions.length === 0
    ) {
      console.log("  OK No obvious issues detected");
      console.log("");
    }
  }

  console.log("");
  console.log("=".repeat(80));
  console.log("END OF ANALYSIS");
  console.log("=".repeat(80));
}

// =============================================================================
// Command: prompt - Show extraction prompt for template
// =============================================================================

async function promptCommand(templateId, templates) {
  const template = getTemplateById(templates, templateId);

  if (!template) {
    console.error("Template not found: " + templateId);
    console.log("\nAvailable templates:");
    templates.forEach((t) => {
      console.log("  - " + t.templateId);
    });
    process.exit(1);
  }

  console.log("# Template: " + template.label);
  console.log("# ID: " + template.templateId);
  console.log("# Integration: " + template.integrationId);
  console.log("");

  console.log("## Description (user-facing)");
  console.log(template.description);
  console.log("");

  if (template.extractionPrompt) {
    console.log("## Extraction Prompt (developer-facing)");
    console.log("```");
    console.log(template.extractionPrompt.trim());
    console.log("```");
  } else {
    console.log("## Extraction Prompt");
    console.log("(none defined - using generic AI inference)");
  }
  console.log("");

  // Show current transformer info
  const transformer = await prisma.dataIngestionTransformer.findUnique({
    where: { templateId },
  });

  if (transformer) {
    console.log("## Current Transformer (stored in DB)");
    console.log("Value label: " + transformer.valueLabel);
    console.log("Data description: " + transformer.dataDescription);
    console.log(
      "Extraction prompt used: " +
        (transformer.extractionPromptUsed ? "YES" : "NO"),
    );
    console.log("");
    console.log("### Code:");
    console.log("```javascript");
    console.log(transformer.transformerCode);
    console.log("```");
  } else {
    console.log("## Current Transformer");
    console.log("(none generated yet)");
  }
}

// =============================================================================
// Command: export - Export data for offline analysis
// =============================================================================

async function exportCommand(metricNameOrId, templates) {
  const outputDir = join(__dirname, "..", "metrics-debug");

  // Create output directory if it doesn't exist
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Find metric
  const metric = await prisma.metric.findFirst({
    where: {
      OR: [
        { id: metricNameOrId },
        { name: { contains: metricNameOrId, mode: "insensitive" } },
      ],
    },
    include: {
      apiLogs: { orderBy: { fetchedAt: "desc" }, take: 5 },
      dataPoints: { orderBy: { timestamp: "desc" }, take: 100 },
      goal: true,
    },
  });

  if (!metric) {
    console.error("Metric not found: " + metricNameOrId);
    process.exit(1);
  }

  // Get transformer
  const transformer = await prisma.dataIngestionTransformer.findUnique({
    where: { templateId: metric.templateId },
  });

  // Get template
  const template = getTemplateById(templates, metric.templateId);

  // Create export bundle
  const exportData = {
    exportedAt: new Date().toISOString(),
    metric: {
      id: metric.id,
      name: metric.name,
      templateId: metric.templateId,
      endpointConfig: metric.endpointConfig,
      pollFrequency: metric.pollFrequency,
      lastFetchedAt: metric.lastFetchedAt,
      lastError: metric.lastError,
    },
    goal: metric.goal
      ? {
          type: metric.goal.goalType,
          targetValue: metric.goal.targetValue,
        }
      : null,
    template: template
      ? {
          label: template.label,
          description: template.description,
          extractionPrompt: template.extractionPrompt,
        }
      : null,
    transformer: transformer
      ? {
          transformerCode: transformer.transformerCode,
          valueLabel: transformer.valueLabel,
          dataDescription: transformer.dataDescription,
          extractionPromptUsed: transformer.extractionPromptUsed,
        }
      : null,
    apiLogs: metric.apiLogs.map((log) => ({
      fetchedAt: log.fetchedAt,
      endpoint: log.endpoint,
      endpointConfig: log.endpointConfig,
      success: log.success,
      error: log.error,
      rawResponse: log.rawResponse,
    })),
    dataPoints: metric.dataPoints.map((dp) => ({
      timestamp: dp.timestamp,
      value: dp.value,
      dimensions: dp.dimensions,
    })),
  };

  // Write to file
  const safeTemplateName = (metric.templateId || "unknown").replace(/[^a-zA-Z0-9-]/g, "_");
  const filename = join(outputDir, `${safeTemplateName}-${Date.now()}.json`);
  writeFileSync(filename, JSON.stringify(exportData, null, 2));
  console.log("Exported to: " + filename);
  console.log("");
  console.log("Export contains:");
  console.log("  - Metric configuration");
  console.log("  - Goal (if set)");
  console.log("  - Template extraction prompt");
  console.log("  - Transformer code");
  console.log("  - " + metric.apiLogs.length + " API log(s) with raw responses");
  console.log("  - " + metric.dataPoints.length + " data point(s)");
}

// =============================================================================
// Help
// =============================================================================

function showHelp() {
  console.log(`
Metrics Pipeline Analysis & Testing CLI

COMMANDS:
  analyze [metricName]     Analyze metrics (default command)
  prompt <templateId>      Show extraction prompt for a template
  export <metricName>      Export metric data for offline analysis
  help                     Show this help

EXAMPLES:
  node scripts/analyze-metrics-pipeline.mjs                    # All metrics
  node scripts/analyze-metrics-pipeline.mjs analyze linear     # Filter by name
  node scripts/analyze-metrics-pipeline.mjs prompt linear-user-issues
  node scripts/analyze-metrics-pipeline.mjs export "My Metric"

WORKFLOW FOR PROMPT ITERATION:
  1. Run: node scripts/analyze-metrics-pipeline.mjs analyze <name>
  2. Check "INFORMATION LOSS ANALYSIS" section for issues
  3. Edit extractionPrompt in src/lib/integrations/<integration>.ts
  4. Delete old transformer: DELETE FROM "DataIngestionTransformer" WHERE "templateId" = 'xxx'
  5. Refresh metric in UI to regenerate transformer
  6. Re-run analyze to verify improvements
`);
}

// =============================================================================
// Main CLI Router
// =============================================================================

async function main() {
  const args = process.argv.slice(2);
  let command = args[0];
  let commandArgs = args.slice(1);

  // Default to analyze if first arg looks like a filter
  if (command && !["analyze", "prompt", "export", "help", "--help", "-h"].includes(command)) {
    commandArgs = [command, ...commandArgs];
    command = "analyze";
  }

  // Load templates
  const templates = await loadTemplates();

  try {
    switch (command) {
      case "help":
      case "--help":
      case "-h":
        showHelp();
        break;

      case "prompt":
        if (!commandArgs[0]) {
          console.error("Usage: analyze-metrics-pipeline.mjs prompt <templateId>");
          console.log("\nAvailable templates:");
          templates.forEach((t) => console.log("  - " + t.templateId));
          process.exit(1);
        }
        await promptCommand(commandArgs[0], templates);
        break;

      case "export":
        if (!commandArgs[0]) {
          console.error("Usage: analyze-metrics-pipeline.mjs export <metricName>");
          process.exit(1);
        }
        await exportCommand(commandArgs[0], templates);
        break;

      case "analyze":
      default:
        await analyzeCommand(commandArgs[0], templates);
        break;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
