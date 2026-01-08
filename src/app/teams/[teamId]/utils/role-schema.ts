/**
 * Canvas-specific role utilities.
 * Form schema and types have been moved to @/lib/role/role-form-schema.ts
 */

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
