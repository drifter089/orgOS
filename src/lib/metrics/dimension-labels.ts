/**
 * Dimension Label Mapping
 *
 * Provides human-readable labels for dimension keys in the UI.
 * The actual valueLabel shown on charts is determined by the AI chart transformer.
 */

const DIMENSION_DISPLAY_LABELS: Record<string, string> = {
  // Linear dimensions
  estimate: "Effort Points",
  priority: "Priority",
  teamName: "Team",
  projectName: "Project",
  assigneeName: "Assignee",

  // GitHub dimensions
  additions: "Lines Added",
  deletions: "Lines Deleted",
  commits: "Commits",

  // Generic dimensions
  count: "Count",
  total: "Total",
  average: "Average",
};

/**
 * Get a display label for a dimension key (for UI dropdowns).
 * Falls back to the key itself if no label is defined.
 */
export function getDimensionDisplayLabel(key: string): string {
  return DIMENSION_DISPLAY_LABELS[key] ?? key;
}
