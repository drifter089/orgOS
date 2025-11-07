import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

/**
 * Generate mock metric value based on type and target
 * TODO: Replace with AI generation (Claude via OpenRouter) for more realistic data
 */
function generateMockValue(type: string, targetValue?: number | null): number {
  const target = targetValue ?? 100;

  switch (type) {
    case "percentage":
      // Generate value 5-15% below target for percentages
      return Math.max(0, Math.min(100, target - Math.random() * 10 - 5));

    case "duration":
      // Generate value 10-30% below target for durations (faster is better)
      return Math.max(
        1,
        target - Math.random() * (target * 0.2) - target * 0.1,
      );

    case "rate":
      // Generate value 20-40% below target for error rates (lower is better)
      return Math.max(
        0,
        target - Math.random() * (target * 0.2) - target * 0.2,
      );

    case "number":
      // Generate value 5-15% below target for numbers
      return Math.max(
        0,
        target - Math.random() * (target * 0.1) - target * 0.05,
      );

    default:
      return target * 0.9;
  }
}

export const metricRouter = createTRPCRouter({
  /**
   * Get all metrics
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Create new metric
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        type: z.enum(["percentage", "number", "duration", "rate"]),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.metric.create({
        data: input,
      });
    }),

  /**
   * Update metric
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        targetValue: z.number().optional(),
        currentValue: z.number().optional(),
        unit: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.db.metric.update({
        where: { id },
        data,
      });
    }),

  /**
   * Generate mock data for a metric
   * Uses simple algorithm for now, can be enhanced with AI generation later
   */
  generateMockData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
      });

      if (!metric) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found",
        });
      }

      // Generate mock value
      const mockValue = generateMockValue(metric.type, metric.targetValue);

      // Store the prompt used for generation (for future AI implementation)
      const prompt = `Generate a realistic ${metric.type} value for the metric "${metric.name}". ${metric.description || ""}. Target: ${metric.targetValue || "none"}. Unit: ${metric.unit || "none"}`;

      // Update metric with generated value
      return ctx.db.metric.update({
        where: { id: input.id },
        data: {
          currentValue: Math.round(mockValue * 100) / 100, // Round to 2 decimal places
          mockDataPrompt: prompt,
        },
      });
    }),

  /**
   * Delete metric (only if not used by any roles)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Check if metric is used by any roles
      const rolesUsingMetric = await ctx.db.role.count({
        where: { metricId: input.id },
      });

      if (rolesUsingMetric > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric. It is used by ${rolesUsingMetric} role(s).`,
        });
      }

      // Delete metric
      await ctx.db.metric.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
