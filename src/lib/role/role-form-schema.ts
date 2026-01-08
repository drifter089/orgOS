import { z } from "zod";

/**
 * Shared Zod schema for role forms.
 * Used by both create and edit dialogs.
 */
export const roleFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  purpose: z.string().min(1, "Purpose is required"),
  accountabilities: z.string().optional(),
  metricId: z.string().optional(),
  assignedUserId: z.string().nullable().optional(),
  effortPoints: z.number().int().nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-F]{6}$/i)
    .optional(),
});

export type RoleFormData = z.infer<typeof roleFormSchema>;
