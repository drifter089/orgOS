/**
 * MetricTransformer Service
 *
 * Handles the full workflow for MetricTransformers:
 * - Check if transformer exists for template
 * - Generate new transformer with AI
 * - Execute transformer against API data
 * - Handle failures and regeneration
 */
import { Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";

import { getTemplate } from "@/lib/integrations";
import type { DataPoint } from "@/lib/metrics/transformer-types";
import { db } from "@/server/db";

import { fetchData } from "../data-fetching/nango";
import {
  generateMetricTransformerCode,
  regenerateMetricTransformerCode,
} from "./ai-generator";
import { executeMetricTransformer, testMetricTransformer } from "./executor";

// =============================================================================
// Types
// =============================================================================

interface GetOrCreateTransformerInput {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
}

interface TransformResult {
  success: boolean;
  dataPoints?: DataPoint[];
  error?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert DataPoints to JSON-compatible format for Prisma
 */
function dataPointsToJson(
  dataPoints: DataPoint[] | undefined,
): Prisma.InputJsonValue | undefined {
  if (!dataPoints) return undefined;
  return dataPoints.map((dp) => ({
    timestamp: dp.timestamp.toISOString(),
    value: dp.value,
    dimensions: dp.dimensions ?? undefined,
  })) as Prisma.InputJsonValue;
}

/**
 * Convert dimensions to Prisma-compatible format
 */
function dimensionsToJson(
  dimensions: Record<string, unknown> | null,
): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
  if (dimensions === null) return Prisma.DbNull;
  return dimensions as Prisma.InputJsonValue;
}

// =============================================================================
// Service Functions
// =============================================================================

/**
 * Get existing transformer or create a new one
 *
 * This is called when a metric is created.
 * If no transformer exists for this template, we:
 * 1. Fetch sample data from the API
 * 2. Pass to AI to generate transformer code
 * 3. Test the transformer
 * 4. Save to database
 */
export async function getOrCreateMetricTransformer(
  input: GetOrCreateTransformerInput,
): Promise<{ transformerId: string; isNew: boolean }> {
  // Check if transformer already exists
  const existing = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (existing?.status === "active") {
    return { transformerId: existing.id, isNew: false };
  }

  // Get template definition
  const template = getTemplate(input.templateId);
  if (!template) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `Template not found: ${input.templateId}`,
    });
  }

  // Fetch sample data from the API
  const sampleResponse = await fetchData(
    input.integrationId,
    input.connectionId,
    template.metricEndpoint,
    {
      method: "GET",
      params: input.endpointConfig,
    },
  );

  // Generate transformer code with AI
  const generated = await generateMetricTransformerCode({
    templateId: input.templateId,
    integrationId: input.integrationId,
    endpoint: template.metricEndpoint,
    method: "GET",
    sampleApiResponse: sampleResponse.data,
    metricDescription: template.description,
    availableParams: template.requiredParams.map(
      (p: { name: string }) => p.name,
    ),
  });

  // Test the transformer
  const testResult = testMetricTransformer(
    generated.code,
    sampleResponse.data,
    input.endpointConfig,
  );

  if (!testResult.success) {
    // Try regenerating once
    const regenerated = await regenerateMetricTransformerCode({
      templateId: input.templateId,
      integrationId: input.integrationId,
      endpoint: template.metricEndpoint,
      method: "GET",
      sampleApiResponse: sampleResponse.data,
      metricDescription: template.description,
      availableParams: template.requiredParams.map(
        (p: { name: string }) => p.name,
      ),
      previousCode: generated.code,
      error: testResult.error,
    });

    const retestResult = testMetricTransformer(
      regenerated.code,
      sampleResponse.data,
      input.endpointConfig,
    );

    if (!retestResult.success) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Failed to generate working transformer: ${retestResult.error}`,
      });
    }

    // Save the regenerated transformer
    const transformer = await db.metricTransformer.upsert({
      where: { templateId: input.templateId },
      create: {
        templateId: input.templateId,
        pollingEndpoint: template.metricEndpoint,
        pollingMethod: "GET",
        historicalEndpoint: template.metricEndpoint,
        historicalMethod: "GET",
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(retestResult.data),
        status: "active",
      },
      update: {
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(retestResult.data),
        status: "active",
        version: { increment: 1 },
        failureCount: 0,
      },
    });

    return { transformerId: transformer.id, isNew: true };
  }

  // Save the transformer
  const transformer = await db.metricTransformer.upsert({
    where: { templateId: input.templateId },
    create: {
      templateId: input.templateId,
      pollingEndpoint: template.metricEndpoint,
      pollingMethod: "GET",
      historicalEndpoint: template.metricEndpoint,
      historicalMethod: "GET",
      transformerCode: generated.code,
      inputExample: sampleResponse.data as Prisma.InputJsonValue,
      outputExample: dataPointsToJson(testResult.data),
      status: "active",
    },
    update: {
      transformerCode: generated.code,
      inputExample: sampleResponse.data as Prisma.InputJsonValue,
      outputExample: dataPointsToJson(testResult.data),
      status: "active",
      version: { increment: 1 },
      failureCount: 0,
    },
  });

  return { transformerId: transformer.id, isNew: true };
}

/**
 * Execute transformer for a metric
 *
 * Fetches data from API and transforms it to DataPoints.
 */
export async function executeTransformerForMetric(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
  useHistorical?: boolean;
}): Promise<TransformResult> {
  // Get the transformer
  const transformer = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (!transformer) {
    return {
      success: false,
      error: `No transformer found for template: ${input.templateId}`,
    };
  }

  if (transformer.status !== "active") {
    return {
      success: false,
      error: `Transformer is not active: ${transformer.status}`,
    };
  }

  // Determine which endpoint and transformer code to use
  const endpoint = input.useHistorical
    ? (transformer.historicalEndpoint ?? transformer.pollingEndpoint)
    : transformer.pollingEndpoint;

  const code =
    input.useHistorical && transformer.historicalTransformerCode
      ? transformer.historicalTransformerCode
      : transformer.transformerCode;

  if (!endpoint || !code) {
    return {
      success: false,
      error: "Transformer endpoint or code not configured",
    };
  }

  // Fetch data from API
  let apiResponse;
  try {
    apiResponse = await fetchData(
      input.integrationId,
      input.connectionId,
      endpoint,
      {
        method:
          ((input.useHistorical
            ? transformer.historicalMethod
            : transformer.pollingMethod) as "GET" | "POST") ?? "GET",
        params: input.endpointConfig,
      },
    );
  } catch (error) {
    return {
      success: false,
      error: `Failed to fetch data: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }

  // Execute the transformer
  const result = executeMetricTransformer(
    code,
    apiResponse.data,
    input.endpointConfig,
  );

  if (!result.success) {
    // Increment failure count
    await db.metricTransformer.update({
      where: { templateId: input.templateId },
      data: { failureCount: { increment: 1 } },
    });

    return {
      success: false,
      error: result.error,
    };
  }

  // Reset failure count on success
  await db.metricTransformer.update({
    where: { templateId: input.templateId },
    data: { failureCount: 0 },
  });

  return {
    success: true,
    dataPoints: result.data,
  };
}

/**
 * Handle transformer failure and regeneration
 *
 * Called when a transformer fails multiple times.
 * Threshold: 3 failures triggers regeneration.
 */
export async function handleTransformerFailure(input: {
  templateId: string;
  integrationId: string;
  connectionId: string;
  endpointConfig: Record<string, string>;
  error: string;
}): Promise<{ regenerated: boolean; error?: string }> {
  const transformer = await db.metricTransformer.findUnique({
    where: { templateId: input.templateId },
  });

  if (!transformer) {
    return { regenerated: false, error: "Transformer not found" };
  }

  // Check if we've hit the failure threshold
  const FAILURE_THRESHOLD = 3;
  if (transformer.failureCount < FAILURE_THRESHOLD) {
    return { regenerated: false };
  }

  // Get template definition
  const template = getTemplate(input.templateId);
  if (!template) {
    return { regenerated: false, error: "Template not found" };
  }

  try {
    // Fetch fresh sample data
    const sampleResponse = await fetchData(
      input.integrationId,
      input.connectionId,
      template.metricEndpoint,
      {
        method: "GET",
        params: input.endpointConfig,
      },
    );

    // Regenerate transformer code
    const regenerated = await regenerateMetricTransformerCode({
      templateId: input.templateId,
      integrationId: input.integrationId,
      endpoint: template.metricEndpoint,
      method: "GET",
      sampleApiResponse: sampleResponse.data,
      metricDescription: template.description,
      availableParams: template.requiredParams.map(
        (p: { name: string }) => p.name,
      ),
      previousCode: transformer.transformerCode,
      error: input.error,
    });

    // Test the new code
    const testResult = testMetricTransformer(
      regenerated.code,
      sampleResponse.data,
      input.endpointConfig,
    );

    if (!testResult.success) {
      // Mark as failed if regeneration doesn't work
      await db.metricTransformer.update({
        where: { templateId: input.templateId },
        data: { status: "failed" },
      });

      return {
        regenerated: false,
        error: `Regeneration failed: ${testResult.error}`,
      };
    }

    // Update with new code
    await db.metricTransformer.update({
      where: { templateId: input.templateId },
      data: {
        transformerCode: regenerated.code,
        inputExample: sampleResponse.data as Prisma.InputJsonValue,
        outputExample: dataPointsToJson(testResult.data),
        version: { increment: 1 },
        failureCount: 0,
        status: "active",
      },
    });

    return { regenerated: true };
  } catch (error) {
    return {
      regenerated: false,
      error: error instanceof Error ? error.message : "Regeneration failed",
    };
  }
}

/**
 * Save data points to database
 */
export async function saveDataPoints(
  metricId: string,
  dataPoints: DataPoint[],
  isTimeSeries: boolean,
): Promise<void> {
  if (!isTimeSeries) {
    // For snapshot data (e.g., Google Sheets), replace all existing data
    await db.$transaction([
      db.metricDataPoint.deleteMany({ where: { metricId } }),
      db.metricDataPoint.createMany({
        data: dataPoints.map((dp) => ({
          metricId,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        })),
      }),
    ]);
  } else {
    // For time-series data, upsert each data point
    for (const dp of dataPoints) {
      await db.metricDataPoint.upsert({
        where: {
          metricId_timestamp: {
            metricId,
            timestamp: dp.timestamp,
          },
        },
        create: {
          metricId,
          timestamp: dp.timestamp,
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        },
        update: {
          value: dp.value,
          dimensions: dimensionsToJson(dp.dimensions),
        },
      });
    }
  }
}

/**
 * Get transformer by template ID
 */
export async function getTransformerByTemplateId(templateId: string) {
  return db.metricTransformer.findUnique({
    where: { templateId },
  });
}
