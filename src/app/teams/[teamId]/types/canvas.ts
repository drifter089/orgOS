/**
 * Type definitions for storing React Flow nodes and edges in the database
 * These types represent the serialized format saved to PostgreSQL JSON columns
 */

export type StoredNode = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data?: {
    roleId?: string;
    title?: string;
    color?: string;
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
