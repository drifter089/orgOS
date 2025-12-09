import { z } from "zod";

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

/** Calculate the center position of the current viewport in flow coordinates */
export function getViewportCenter(
  reactFlowInstance: {
    screenToFlowPosition: (position: { x: number; y: number }) => {
      x: number;
      y: number;
    };
  } | null,
): { x: number; y: number } {
  if (!reactFlowInstance) {
    return { x: 400, y: 300 };
  }

  const container = document.querySelector(".react-flow");
  if (!container) {
    return { x: 400, y: 300 };
  }

  const rect = container.getBoundingClientRect();
  const screenCenterX = rect.left + rect.width / 2;
  const screenCenterY = rect.top + rect.height / 2;

  return reactFlowInstance.screenToFlowPosition({
    x: screenCenterX,
    y: screenCenterY,
  });
}
