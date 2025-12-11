import { z } from "zod";

import { systemsStoredNodeSchema } from "@/app/systems/schemas/canvas";
import { storedEdgeSchema, viewportSchema } from "@/lib/canvas";
import { createTRPCRouter, workspaceProcedure } from "@/server/api/trpc";
import {
  cacheStrategy,
  shortLivedCache,
} from "@/server/api/utils/cache-strategy";

export const systemsCanvasRouter = createTRPCRouter({
  get: workspaceProcedure.query(async ({ ctx }) => {
    const canvas = await ctx.db.systemsCanvas.findUnique({
      where: { organizationId: ctx.workspace.organizationId },
      ...cacheStrategy(shortLivedCache),
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
        reactFlowNodes: z.array(systemsStoredNodeSchema).optional(),
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
