/**
 * Base store types for canvas state management.
 * These types define the common state and actions shared across all canvas implementations.
 */
import type {
  Edge,
  Node,
  OnConnect,
  OnEdgesChange,
  OnNodesChange,
} from "@xyflow/react";

/**
 * Base state shared by all canvas stores.
 * Contains the core React Flow state plus common UI state for auto-save.
 *
 * @template TNode - The node type used in this canvas
 * @template TEdge - The edge type used in this canvas
 */
export type BaseCanvasState<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = {
  /** Current nodes in the canvas */
  nodes: TNode[];
  /** Current edges in the canvas */
  edges: TEdge[];
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Timestamp of the last successful save */
  lastSaved: Date | null;
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether the canvas has been initialized (prevents initial setup from triggering saves) */
  isInitialized: boolean;
};

/**
 * Base actions shared by all canvas stores.
 * These are the standard React Flow handlers plus state management utilities.
 *
 * @template TNode - The node type used in this canvas
 * @template TEdge - The edge type used in this canvas
 */
export type BaseCanvasActions<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = {
  /** Handler for node changes (move, select, remove, etc.) */
  onNodesChange: OnNodesChange<TNode>;
  /** Handler for edge changes (select, remove, etc.) */
  onEdgesChange: OnEdgesChange<TEdge>;
  /** Handler for new connections between nodes */
  onConnect: OnConnect;
  /** Replace all nodes */
  setNodes: (nodes: TNode[]) => void;
  /** Replace all edges */
  setEdges: (edges: TEdge[]) => void;
  /** Mark the canvas as having unsaved changes */
  markDirty: () => void;
  /** Mark the canvas as saved (no unsaved changes) */
  markClean: () => void;
  /** Set the initialization state */
  setInitialized: (initialized: boolean) => void;
  /** Set the saving state */
  setSaving: (saving: boolean) => void;
  /** Record the last save timestamp */
  setLastSaved: (date: Date) => void;
};

/**
 * Combined base store type with both state and actions.
 *
 * @template TNode - The node type used in this canvas
 * @template TEdge - The edge type used in this canvas
 */
export type BaseCanvasStore<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
> = BaseCanvasState<TNode, TEdge> & BaseCanvasActions<TNode, TEdge>;
