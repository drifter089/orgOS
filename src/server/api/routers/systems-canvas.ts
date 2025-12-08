import { z } from "zod";

import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import { cacheStrategy, configCache } from "@/server/api/utils/cache-strategy";

const storedNodeSchema = z.object({
  id: z.string(),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

const storedEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
});

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export const systemsCanvasRouter = createTRPCRouter({
  get: workspaceProcedure.query(async ({ ctx }) => {
    const canvas = await ctx.db.systemsCanvas.findUnique({
      where: { organizationId: ctx.workspace.organizationId },
      ...cacheStrategy(configCache),
    });

    if (!canvas) {
      return ctx.db.systemsCanvas.create({
        data: {
          organizationId: ctx.workspace.organizationId,
          reactFlowNodes: [],
          reactFlowEdges: [],
        },
      });
    }

    return canvas;
  }),

  update: workspaceProcedure
    .input(
      z.object({
        reactFlowNodes: z.array(storedNodeSchema).optional(),
        reactFlowEdges: z.array(storedEdgeSchema).optional(),
        viewport: viewportSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.systemsCanvas.upsert({
        where: { organizationId: ctx.workspace.organizationId },
        create: {
          organizationId: ctx.workspace.organizationId,
          reactFlowNodes: input.reactFlowNodes ?? [],
          reactFlowEdges: input.reactFlowEdges ?? [],
          viewport: input.viewport,
        },
        update: {
          ...(input.reactFlowNodes !== undefined && {
            reactFlowNodes: input.reactFlowNodes,
          }),
          ...(input.reactFlowEdges !== undefined && {
            reactFlowEdges: input.reactFlowEdges,
          }),
          ...(input.viewport !== undefined && { viewport: input.viewport }),
        },
      });
    }),
});
