import { CollectionFrequency, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";
import { getUserOrganizationId } from "@/server/api/utils/authorization";

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
   * Get all metrics for user's organization
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const organizationId = await getUserOrganizationId(ctx.user.id);

    return ctx.db.metric.findMany({
      where: { organizationId },
      orderBy: { name: "asc" },
    });
  }),

  /**
   * Create new metric for user's organization
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        type: z.enum(["percentage", "number", "duration", "rate"]),
        targetValue: z.number().optional(),
        unit: z.string().optional(),
        category: z.string().optional(),
        collectionFrequency: z.nativeEnum(CollectionFrequency).default("DAILY"),
        dataSource: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      return ctx.db.metric.create({
        data: {
          ...input,
          organizationId,
        },
      });
    }),

  /**
   * Update metric (organization scoping is enforced by checking metric ownership)
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
        category: z.string().optional(),
        collectionFrequency: z.nativeEnum(CollectionFrequency).optional(),
        dataSource: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      // Verify metric belongs to user's organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
      });

      if (metric?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or you don't have access",
        });
      }

      const { id, ...data } = input;
      return ctx.db.metric.update({
        where: { id },
        data,
      });
    }),

  /**
   * Generate mock data for a metric
   * Creates a MetricValue record with generated data
   */
  generateMockData: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
      });

      if (metric?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or you don't have access",
        });
      }

      // Generate mock value
      const mockValue = generateMockValue(metric.type, metric.targetValue);
      const roundedValue = Math.round(mockValue * 100) / 100;

      // Create MetricValue record
      await ctx.db.metricValue.create({
        data: {
          metricId: metric.id,
          value: roundedValue,
          timestamp: new Date(),
          metadata: {
            generated: true,
            source: "mock_generator",
          },
        },
      });

      // Update metric's current value
      return ctx.db.metric.update({
        where: { id: input.id },
        data: {
          currentValue: roundedValue,
        },
      });
    }),

  /**
   * Get historical values for a metric
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        metricId: z.string(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(1000).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      // Verify metric belongs to user's organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (metric?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or you don't have access",
        });
      }

      // Build where clause for date filtering
      const where: {
        metricId: string;
        timestamp?: { gte?: Date; lte?: Date };
      } = {
        metricId: input.metricId,
      };

      if (input.startDate || input.endDate) {
        where.timestamp = {};
        if (input.startDate) where.timestamp.gte = input.startDate;
        if (input.endDate) where.timestamp.lte = input.endDate;
      }

      return ctx.db.metricValue.findMany({
        where,
        orderBy: { timestamp: "desc" },
        take: input.limit,
      });
    }),

  /**
   * Add a new metric value (for manual data entry or integrations)
   */
  addValue: protectedProcedure
    .input(
      z.object({
        metricId: z.string(),
        value: z.number(),
        timestamp: z.date().optional(),
        metadata: z.record(z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      // Verify metric belongs to user's organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.metricId },
      });

      if (metric?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or you don't have access",
        });
      }

      // Create the metric value
      const metricValue = await ctx.db.metricValue.create({
        data: {
          metricId: input.metricId,
          value: input.value,
          timestamp: input.timestamp ?? new Date(),
          ...(input.metadata && {
            metadata: input.metadata as Prisma.InputJsonValue,
          }),
        },
      });

      // Update metric's current value to the latest
      await ctx.db.metric.update({
        where: { id: input.metricId },
        data: { currentValue: input.value },
      });

      return metricValue;
    }),

  /**
   * Delete metric (only if not used by any roles)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const organizationId = await getUserOrganizationId(ctx.user.id);

      // Verify metric belongs to user's organization
      const metric = await ctx.db.metric.findUnique({
        where: { id: input.id },
      });

      if (metric?.organizationId !== organizationId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Metric not found or you don't have access",
        });
      }

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

      // Delete metric (cascade will delete MetricValues)
      await ctx.db.metric.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
