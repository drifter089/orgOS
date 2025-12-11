import { z } from "zod";

export const storedPositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const storedEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  type: z.string().optional(),
  animated: z.boolean().optional(),
});

export const storedNodeBaseSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: storedPositionSchema,
  style: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
  data: z.record(z.unknown()).optional(),
});

export const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  zoom: z.number(),
});

export type StoredPosition = z.infer<typeof storedPositionSchema>;
export type StoredEdge = z.infer<typeof storedEdgeSchema>;
export type StoredNodeBase = z.infer<typeof storedNodeBaseSchema>;
export type Viewport = z.infer<typeof viewportSchema>;
