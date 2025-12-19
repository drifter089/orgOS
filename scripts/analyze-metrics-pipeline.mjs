/**
 * Analyze Metrics Pipeline Script
 *
 * This script fetches all metric data for Claude Code to analyze:
 * - Raw API responses (what data comes from the API)
 * - Data Ingestion Transformer (AI-generated code that transforms API → DataPoints)
 * - Stored DataPoints (what actually gets saved to DB)
 * - Metric configuration and goals
 *
 * Use this to identify:
 * - Information loss in the pipeline
 * - Missing dimensions that could be tracked
 * - Incorrect grouping/aggregation logic
 * - Opportunities to improve AI prompts for transformer generation
 *
 * Run: node scripts/analyze-metrics-pipeline.mjs [metricName]
 * Examples:
 *   node scripts/analyze-metrics-pipeline.mjs           # All metrics
 *   node scripts/analyze-metrics-pipeline.mjs linear    # Filter by name containing "linear"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function analyzeMetric(metric, ingestionTransformer) {
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
    goal: metric.goal ? {
      type: metric.goal.goalType,
      targetValue: metric.goal.targetValue,
    } : null,
    ingestionTransformer: ingestionTransformer ? {
      templateId: ingestionTransformer.templateId,
      valueLabel: ingestionTransformer.valueLabel,
      dataDescription: ingestionTransformer.dataDescription,
      transformerCode: ingestionTransformer.transformerCode,
    } : null,
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
    points.forEach(p => {
      if (p.dimensions) {
        Object.keys(p.dimensions).forEach(k => allDimKeys.add(k));
      }
    });

    output.dataPointsAnalysis = {
      totalPoints: points.length,
      dateRange: {
        oldest: points[points.length - 1]?.timestamp,
        newest: points[0]?.timestamp,
      },
      valueStats: {
        min: Math.min(...points.map(p => p.value)),
        max: Math.max(...points.map(p => p.value)),
        avg: points.reduce((sum, p) => sum + p.value, 0) / points.length,
      },
      dimensionKeys: Array.from(allDimKeys),
      samplePoints: points.slice(0, 5).map(p => ({
        date: p.timestamp.toISOString().split('T')[0],
        value: p.value,
        dimensions: p.dimensions,
      })),
    };
  }

  // Analyze Information Loss
  output.informationLossAnalysis = analyzeInformationLoss(
    output.apiAnalysis,
    output.dataPointsAnalysis,
    output.ingestionTransformer
  );

  return output;
}

function analyzeResponseStructure(raw) {
  if (!raw) return null;

  // Handle different API response formats
  if (raw.data?.issues?.nodes) {
    // Linear GraphQL format
    const nodes = raw.data.issues.nodes;
    const firstNode = nodes[0];
    return {
      type: 'linear-graphql',
      totalRecords: nodes.length,
      availableFields: firstNode ? Object.keys(firstNode) : [],
      nestedFields: firstNode ? extractNestedFields(firstNode) : {},
    };
  }

  if (raw.results && Array.isArray(raw.results)) {
    // PostHog format
    return {
      type: 'posthog-query',
      totalRecords: raw.results.length,
      columns: raw.columns || [],
      types: raw.types || [],
    };
  }

  if (Array.isArray(raw)) {
    // GitHub array format
    const first = raw[0];
    return {
      type: 'array',
      totalRecords: raw.length,
      itemStructure: Array.isArray(first) ? 'tuple' : typeof first,
      sampleItem: first,
    };
  }

  return {
    type: 'unknown',
    keys: Object.keys(raw),
  };
}

function extractNestedFields(obj) {
  const nested = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      nested[key] = Object.keys(value);
    }
  }
  return nested;
}

function extractSampleData(raw) {
  if (!raw) return null;

  // Linear
  if (raw.data?.issues?.nodes) {
    return {
      format: 'linear',
      samples: raw.data.issues.nodes.slice(0, 3),
    };
  }

  // PostHog
  if (raw.results && Array.isArray(raw.results)) {
    return {
      format: 'posthog',
      columns: raw.columns,
      samples: raw.results.slice(0, 5),
    };
  }

  // GitHub array
  if (Array.isArray(raw)) {
    return {
      format: 'array',
      samples: raw.slice(0, 5),
    };
  }

  return { format: 'unknown', raw: JSON.stringify(raw).slice(0, 500) };
}

function analyzeInformationLoss(apiAnalysis, dataPointsAnalysis, transformer) {
  const issues = [];
  const suggestions = [];

  if (!apiAnalysis || !dataPointsAnalysis) {
    return { issues: ['Insufficient data for analysis'], suggestions: [] };
  }

  const structure = apiAnalysis.responseStructure;

  // Linear-specific analysis
  if (structure?.type === 'linear-graphql') {
    const availableFields = structure.availableFields || [];
    const storedDims = dataPointsAnalysis.dimensionKeys || [];

    // Check for date field usage
    if (availableFields.includes('completedAt') && availableFields.includes('createdAt')) {
      issues.push('API has both createdAt and completedAt - verify correct date is used for grouping');

      if (transformer?.transformerCode?.includes('createdAt') &&
          !transformer?.transformerCode?.includes('completedAt')) {
        issues.push('CRITICAL: Transformer groups by createdAt only - completedAt is ignored');
        suggestions.push('To track "completed work per day", group by completedAt instead of createdAt');
        suggestions.push('Consider creating separate data points for created vs completed metrics');
      }
    }

    // Check for missing useful fields
    const usefulFields = ['estimate', 'priority', 'project', 'team', 'labels'];
    usefulFields.forEach(field => {
      if (availableFields.includes(field) && !storedDims.includes(field)) {
        // Check if it's being aggregated differently
        const isAggregated = transformer?.transformerCode?.includes(field);
        if (!isAggregated) {
          issues.push(`Field "${field}" available in API but not stored in dimensions`);
        }
      }
    });

    // Check nested fields
    const nestedFields = structure.nestedFields || {};
    if (nestedFields.state) {
      suggestions.push('State object has fields: ' + nestedFields.state.join(', '));
    }
    if (nestedFields.team) {
      suggestions.push('Team object has fields: ' + nestedFields.team.join(', ') + ' - could group by team');
    }
    if (nestedFields.project) {
      suggestions.push('Project object available - could group by project');
    }
  }

  // PostHog-specific analysis
  if (structure?.type === 'posthog-query') {
    if (dataPointsAnalysis.dimensionKeys.length === 0) {
      suggestions.push('PostHog data has no dimensions - consider adding breakdown by property');
    }
  }

  // GitHub-specific analysis
  if (structure?.type === 'array' && structure?.itemStructure === 'tuple') {
    suggestions.push('GitHub returns weekly aggregates - daily granularity not available from this endpoint');
  }

  return { issues, suggestions };
}

async function main() {
  const filterName = process.argv[2]?.toLowerCase();

  console.log('='.repeat(80));
  console.log('METRICS PIPELINE ANALYSIS');
  console.log('Generated for Claude Code to analyze and improve AI prompts');
  console.log('='.repeat(80));
  console.log('');

  // Fetch all metrics with related data
  let metrics = await prisma.metric.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      apiLogs: { orderBy: { fetchedAt: 'desc' }, take: 1 },
      dataPoints: { orderBy: { timestamp: 'desc' }, take: 20 },
      goal: true,
    },
  });

  // Filter by name if provided
  if (filterName) {
    metrics = metrics.filter(m => m.name.toLowerCase().includes(filterName));
    console.log('Filtered to metrics containing: "' + filterName + '"');
    console.log('');
  }

  // Fetch all ingestion transformers
  const transformers = await prisma.dataIngestionTransformer.findMany();
  const transformerMap = new Map(transformers.map(t => [t.templateId, t]));

  console.log('Found ' + metrics.length + ' metric(s) to analyze');
  console.log('');

  for (const metric of metrics) {
    const transformer = transformerMap.get(metric.templateId);
    const analysis = await analyzeMetric(metric, transformer);

    console.log('');
    console.log('#'.repeat(80));
    console.log('# METRIC: ' + analysis.metric.name);
    console.log('# Template: ' + analysis.metric.templateId);
    console.log('#'.repeat(80));
    console.log('');

    // Metric Config
    console.log('## METRIC CONFIGURATION');
    console.log(JSON.stringify(analysis.metric, null, 2));
    console.log('');

    // Goal
    if (analysis.goal) {
      console.log('## GOAL');
      console.log(JSON.stringify(analysis.goal, null, 2));
      console.log('');
    }

    // Ingestion Transformer
    if (analysis.ingestionTransformer) {
      console.log('## DATA INGESTION TRANSFORMER');
      console.log('Value Label: ' + analysis.ingestionTransformer.valueLabel);
      console.log('Data Description: ' + analysis.ingestionTransformer.dataDescription);
      console.log('');
      console.log('### Transformer Code:');
      console.log('```javascript');
      console.log(analysis.ingestionTransformer.transformerCode);
      console.log('```');
      console.log('');
    }

    // API Analysis
    if (analysis.apiAnalysis) {
      console.log('## API RESPONSE ANALYSIS');
      console.log('Endpoint: ' + analysis.apiAnalysis.endpoint);
      console.log('Fetched: ' + analysis.apiAnalysis.fetchedAt);
      console.log('');
      console.log('### Response Structure:');
      console.log(JSON.stringify(analysis.apiAnalysis.responseStructure, null, 2));
      console.log('');
      console.log('### Sample Data:');
      console.log(JSON.stringify(analysis.apiAnalysis.sampleData, null, 2));
      console.log('');
    }

    // DataPoints Analysis
    if (analysis.dataPointsAnalysis) {
      console.log('## STORED DATA POINTS');
      console.log('Total Points: ' + analysis.dataPointsAnalysis.totalPoints);
      console.log('Date Range: ' + analysis.dataPointsAnalysis.dateRange.oldest + ' to ' + analysis.dataPointsAnalysis.dateRange.newest);
      console.log('Value Stats: min=' + analysis.dataPointsAnalysis.valueStats.min +
                  ', max=' + analysis.dataPointsAnalysis.valueStats.max +
                  ', avg=' + analysis.dataPointsAnalysis.valueStats.avg.toFixed(2));
      console.log('Dimension Keys: ' + JSON.stringify(analysis.dataPointsAnalysis.dimensionKeys));
      console.log('');
      console.log('### Sample Points:');
      analysis.dataPointsAnalysis.samplePoints.forEach(p => {
        console.log('  ' + p.date + ': value=' + p.value + ', dims=' + JSON.stringify(p.dimensions));
      });
      console.log('');
    }

    // Information Loss Analysis
    console.log('## INFORMATION LOSS ANALYSIS');
    if (analysis.informationLossAnalysis.issues.length > 0) {
      console.log('### Issues Found:');
      analysis.informationLossAnalysis.issues.forEach(issue => {
        console.log('  ⚠️  ' + issue);
      });
      console.log('');
    }
    if (analysis.informationLossAnalysis.suggestions.length > 0) {
      console.log('### Suggestions:');
      analysis.informationLossAnalysis.suggestions.forEach(sug => {
        console.log('  💡 ' + sug);
      });
      console.log('');
    }
    if (analysis.informationLossAnalysis.issues.length === 0 &&
        analysis.informationLossAnalysis.suggestions.length === 0) {
      console.log('  ✅ No obvious issues detected');
      console.log('');
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('END OF ANALYSIS');
  console.log('='.repeat(80));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
