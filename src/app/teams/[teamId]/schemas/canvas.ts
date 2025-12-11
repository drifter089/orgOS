import { z } from "zod";

import { storedNodeBaseSchema } from "@/lib/canvas/schemas/stored-data";

const textNodeFontSizeSchema = z.enum(["small", "medium", "large"]);

export const teamStoredNodeSchema = storedNodeBaseSchema.extend({
  data: z
    .object({
      // For role-node
      roleId: z.string().optional(),
      title: z.string().optional(),
      color: z.string().optional(),
      // For text-node
      text: z.string().optional(),
      fontSize: textNodeFontSizeSchema.optional(),
      // For chart-node
      dashboardMetricId: z.string().optional(),
    })
    .optional(),
});

export type TeamStoredNode = z.infer<typeof teamStoredNodeSchema>;
