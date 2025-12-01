/**
 * Type definitions for storing React Flow nodes and edges in the database
 * These types represent the serialized format saved to PostgreSQL JSON columns
 */

export type TextNodeFontSize = "small" | "medium" | "large";

export const FONT_SIZE_VALUES: Record<TextNodeFontSize, number> = {
  small: 12,
  medium: 14,
  large: 18,
};

export type StoredNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: {
    // For role-node
    roleId?: string;
    title?: string;
    color?: string;
    // For text-node
    text?: string;
    fontSize?: TextNodeFontSize;
  };
  // For resizable nodes (text-node)
  style?: {
    width?: number;
    height?: number;
  };
};

export type StoredEdge = {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  animated?: boolean;
};
