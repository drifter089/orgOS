import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";

function generateMockValue(type: string, targetValue?: number | null): number {
  const target = targetValue ?? 100;

  switch (type) {
    case "percentage":
      return Math.max(0, Math.min(100, target - Math.random() * 10 - 5));
    case "duration":
      return Math.max(
        1,
        target - Math.random() * (target * 0.2) - target * 0.1,
      );
    case "rate":
      return Math.max(
        0,
        target - Math.random() * (target * 0.2) - target * 0.2,
      );
    case "number":
      return Math.max(
        0,
        target - Math.random() * (target * 0.1) - target * 0.05,
      );
    default:
      return target * 0.9;
  }
}

export const metricRouter = createTRPCRouter({
  getAll: workspaceProcedure.query(async ({ ctx }) => {
    return ctx.db.metric.findMany({
      where: { organizationId: ctx.workspace.organizationId },
      orderBy: { name: "asc" },
    });
  }),

  getByTeam: workspaceProcedure
    .input(z.object({ teamId: z.string() }))
    .query(async ({ ctx, input }) => {
      const team = await ctx.db.team.findUnique({
        where: { id: input.teamId },
      });

      if (!team) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Team not found" });
      }

      if (team.organizationId !== ctx.workspace.organizationId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied to team metrics",
        });
      }

      return ctx.db.metric.findMany({
        where: { organizationId: ctx.workspace.organizationId },
        orderBy: { name: "asc" },
      });
    }),

  create: workspaceProcedure
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
        data: {
          ...input,
          organizationId: ctx.workspace.organizationId,
        },
      });
    }),

  update: workspaceProcedure
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

  generateMockData: workspaceProcedure
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

      const mockValue = generateMockValue(metric.type, metric.targetValue);
      const prompt = `Generate a realistic ${metric.type} value for the metric "${metric.name}". ${metric.description || ""}. Target: ${metric.targetValue || "none"}. Unit: ${metric.unit || "none"}`;

      return ctx.db.metric.update({
        where: { id: input.id },
        data: {
          currentValue: Math.round(mockValue * 100) / 100,
          mockDataPrompt: prompt,
        },
      });
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const rolesUsingMetric = await ctx.db.role.count({
        where: { metricId: input.id },
      });

      if (rolesUsingMetric > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot delete metric. It is used by ${rolesUsingMetric} role(s).`,
        });
      }

      await ctx.db.metric.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),
});
