/**
 * TODO: Implement as part of METRICS_ARCHITECTURE_PLAN.md
 *
 * This tRPC router will handle: Transformer CRUD and execution
 *
 * Procedures to implement:
 *
 * MetricTransformer:
 * - createMetricTransformer: Generate transformer code with AI for a template
 * - getMetricTransformer: Get transformer by templateId
 * - executeMetricTransformer: Run transformer against raw API data
 * - regenerateMetricTransformer: Re-generate transformer code with new prompt
 *
 * ChartTransformer:
 * - createChartTransformer: Generate chart config transformer with AI
 * - getChartTransformer: Get transformer by metricId
 * - executeChartTransformer: Transform DataPoints into chart config
 * - regenerateChartTransformer: Re-generate with different preferences
 *
 * See METRICS_ARCHITECTURE_PLAN.md for:
 * - Schema details
 * - AI prompt structure
 * - Code validation and sandboxing
 * - Security considerations
 */
import { createTRPCRouter } from "@/server/api/trpc";

export const transformerRouter = createTRPCRouter({
  // TODO: Implement procedures
});
