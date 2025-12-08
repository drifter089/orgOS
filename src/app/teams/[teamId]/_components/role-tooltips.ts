export const ROLE_FIELD_TOOLTIPS = {
  title:
    "The official name for this role. Keep it clear and recognizable (e.g., 'Product Manager', 'Lead Engineer').",
  purpose:
    "The core reason this role exists. Describe the primary value and outcomes this role delivers to the organization.",
  accountabilities:
    "Specific outcomes and deliverables this role is responsible for. List key responsibilities that others can rely on this role to fulfill.",
  metric:
    "Link a KPI or metric that measures this role's success. This helps track performance and alignment with team goals.",
  assignedTo:
    "The team member currently filling this role. One person can hold multiple roles.",
  color:
    "Visual color for the role card on the canvas. Helps distinguish between different role types or domains.",
  effortPoints:
    "Estimated effort/complexity using Fibonacci-like story points. Higher numbers indicate more time, responsibility, or complexity. Common scale: 1 (trivial), 3 (small), 5 (medium), 8 (large), 13+ (very large).",
} as const;

export const EFFORT_POINT_OPTIONS = [1, 2, 3, 5, 8, 13, 20, 40] as const;
