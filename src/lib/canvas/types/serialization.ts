/**
 * Shared type definitions for storing React Flow nodes and edges in the database.
 * These types represent the serialized format saved to PostgreSQL JSON columns.
 */

/**
 * Base type for stored nodes - contains only the essential position data.
 */
export type StoredNodeBase = {
  id: string;
  type: string;
  position: { x: number; y: number };
};

/**
 * Stored edge type for database persistence.
 * Includes all necessary connection information.
 */
export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
};

/**
 * Text node font size options for resizable text nodes.
 */
export type TextNodeFontSize = "small" | "medium" | "large";

/**
 * Mapping from font size names to pixel values.
 */
export const FONT_SIZE_VALUES: Record<TextNodeFontSize, number> = {
  small: 12,
  medium: 14,
  large: 18,
};

/**
 * Generic stored node with optional data and style.
 * Use this as a base for feature-specific node types.
 *
 * @template TData - Optional data payload type for the node
 */
export type StoredNode<TData = Record<string, unknown>> = StoredNodeBase & {
  data?: TData;
  style?: { width?: number; height?: number };
};
