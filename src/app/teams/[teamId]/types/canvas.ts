/**
 * Type definitions for storing React Flow nodes and edges in the database.
 * Re-exports shared types and adds team-specific node data types.
 */
import {
  FONT_SIZE_VALUES,
  type Points,
  type StoredEdge as StoredEdgeBase,
  type StoredNode as StoredNodeBase,
  type TextNodeFontSize,
} from "@/lib/canvas";

// Re-export shared types
export { FONT_SIZE_VALUES, type TextNodeFontSize };

/**
 * KPI edge data for role-metric connections.
 * Stored with the edge to enable backend sync.
 */
export type KpiEdgeData = {
  /** When true, hides action buttons (for public views) */
  readOnly?: boolean;
  /** The role ID being connected */
  roleId: string;
  /** The metric ID being assigned to the role */
  metricId: string;
};

/**
 * Team-specific stored edge that can include KPI edge data.
 */
export type StoredEdge = StoredEdgeBase & {
  data?: KpiEdgeData;
};

/**
 * Team-specific stored node data shape.
 */
export type TeamStoredNodeData = {
  // For role-node
  roleId?: string;
  title?: string;
  color?: string;
  // For text-node
  text?: string;
  fontSize?: TextNodeFontSize;
  // For freehand node
  points?: Points;
  initialSize?: { width: number; height: number };
  // For chart-node
  dashboardMetricId?: string;
};

/**
 * Team-specific StoredNode with known data shape.
 */
export type StoredNode = StoredNodeBase<TeamStoredNodeData>;
