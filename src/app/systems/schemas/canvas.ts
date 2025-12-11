import { z } from "zod";

import { storedPositionSchema } from "@/lib/canvas";

const textNodeFontSizeSchema = z.enum(["small", "medium", "large"]);

export const systemsStoredNodeSchema = z.object({
  id: z.string(),
  type: z.string().optional(),
  position: storedPositionSchema,
  data: z
    .object({
      // For text-node
      text: z.string().optional(),
      fontSize: textNodeFontSizeSchema.optional(),
    })
    .optional(),
  style: z
    .object({
      width: z.number().optional(),
      height: z.number().optional(),
    })
    .optional(),
});

export type SystemsStoredNode = z.infer<typeof systemsStoredNodeSchema>;
