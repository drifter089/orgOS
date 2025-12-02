"use client";

import { useEffect, useRef } from "react";

import type { Edge, Node } from "@xyflow/react";
import { toast } from "sonner";

/** Default debounce delay for auto-save in milliseconds */
export const DEFAULT_AUTO_SAVE_DELAY = 2000;

/**
 * Options for the auto-save hook.
 *
 * @template TNode - The node type
 * @template TEdge - The edge type
 * @template TSerializedNode - The serialized node format for storage
 * @template TSerializedEdge - The serialized edge format for storage
 */
export type AutoSaveOptions<
  TNode extends Node,
  TEdge extends Edge,
  TSerializedNode = unknown,
  TSerializedEdge = unknown,
> = {
  /** Current nodes in the canvas */
  nodes: TNode[];
  /** Current edges in the canvas */
  edges: TEdge[];
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Function to mark the canvas as clean (no unsaved changes) */
  markClean: () => void;
  /** Function to set the saving state */
  setSaving: (saving: boolean) => void;
  /** Function to record the last save timestamp */
  setLastSaved: (date: Date) => void;
  /** Function to serialize nodes for storage */
  serializeNodes: (nodes: TNode[]) => TSerializedNode[];
  /** Function to serialize edges for storage */
  serializeEdges: (edges: TEdge[]) => TSerializedEdge[];
  /** Mutation object with mutate function and isPending state */
  mutation: {
    mutate: (data: {
      reactFlowNodes: TSerializedNode[];
      reactFlowEdges: TSerializedEdge[];
    }) => void;
    isPending: boolean;
  };
  /** Debounce delay in milliseconds (default: 2000) */
  delay?: number;
};

/**
 * Generic auto-save hook for canvas state.
 *
 * This hook provides debounced auto-saving with:
 * - Configurable debounce delay
 * - Snapshot comparison to detect changes during save
 * - Toast notifications on error
 * - Proper cleanup on unmount
 *
 * @example
 * ```tsx
 * const { isSaving } = useCanvasAutoSave({
 *   nodes,
 *   edges,
 *   isDirty,
 *   markClean,
 *   setSaving,
 *   setLastSaved,
 *   serializeNodes,
 *   serializeEdges,
 *   mutation: {
 *     mutate: (data) => updateMutation.mutate({ id, ...data }),
 *     isPending: updateMutation.isPending,
 *   },
 * });
 * ```
 */
export function useCanvasAutoSave<
  TNode extends Node,
  TEdge extends Edge,
  TSerializedNode = unknown,
  TSerializedEdge = unknown,
>({
  nodes,
  edges,
  isDirty,
  markClean,
  setSaving,
  setLastSaved,
  serializeNodes,
  serializeEdges,
  mutation,
  delay = DEFAULT_AUTO_SAVE_DELAY,
}: AutoSaveOptions<TNode, TEdge, TSerializedNode, TSerializedEdge>): {
  isSaving: boolean;
} {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingSnapshotRef = useRef<{
    nodes: TSerializedNode[];
    edges: TSerializedEdge[];
  } | null>(null);

  // Track current nodes/edges for snapshot comparison in callbacks
  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  nodesRef.current = nodes;
  edgesRef.current = edges;

  // Track callbacks in refs to avoid stale closures
  const markCleanRef = useRef(markClean);
  const setLastSavedRef = useRef(setLastSaved);
  const setSavingRef = useRef(setSaving);
  const serializeNodesRef = useRef(serializeNodes);
  const serializeEdgesRef = useRef(serializeEdges);
  markCleanRef.current = markClean;
  setLastSavedRef.current = setLastSaved;
  setSavingRef.current = setSaving;
  serializeNodesRef.current = serializeNodes;
  serializeEdgesRef.current = serializeEdges;

  useEffect(() => {
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Don't save if not dirty or already saving
    if (!isDirty || mutation.isPending) {
      return;
    }

    // Debounce: save after delay of no changes
    saveTimeoutRef.current = setTimeout(() => {
      setSavingRef.current(true);

      // Serialize nodes and edges for storage
      const serializedNodes = serializeNodesRef.current(nodesRef.current);
      const serializedEdges = serializeEdgesRef.current(edgesRef.current);

      // Store snapshot of what we're sending
      pendingSnapshotRef.current = {
        nodes: serializedNodes,
        edges: serializedEdges,
      };

      mutation.mutate({
        reactFlowNodes: serializedNodes,
        reactFlowEdges: serializedEdges,
      });
    }, delay);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [isDirty, nodes, edges, mutation, delay]);

  return {
    isSaving: mutation.isPending,
  };
}

/**
 * Creates mutation callbacks for auto-save.
 * Use this with tRPC mutations to get properly typed callbacks.
 *
 * @example
 * ```tsx
 * const updateMutation = api.team.update.useMutation(
 *   createAutoSaveCallbacks({
 *     nodes,
 *     edges,
 *     markClean,
 *     setLastSaved,
 *     setSaving,
 *     serializeNodes,
 *     serializeEdges,
 *     pendingSnapshotRef,
 *     errorMessage: "Failed to save team",
 *   })
 * );
 * ```
 */
export function createAutoSaveCallbacks<
  TNode extends Node,
  TEdge extends Edge,
  TSerializedNode = unknown,
  TSerializedEdge = unknown,
>(options: {
  nodes: TNode[];
  edges: TEdge[];
  markClean: () => void;
  setLastSaved: (date: Date) => void;
  setSaving: (saving: boolean) => void;
  serializeNodes: (nodes: TNode[]) => TSerializedNode[];
  serializeEdges: (edges: TEdge[]) => TSerializedEdge[];
  pendingSnapshotRef: React.MutableRefObject<{
    nodes: TSerializedNode[];
    edges: TSerializedEdge[];
  } | null>;
  errorMessage?: string;
}) {
  const {
    nodes,
    edges,
    markClean,
    setLastSaved,
    setSaving,
    serializeNodes,
    serializeEdges,
    pendingSnapshotRef,
    errorMessage = "Failed to save canvas",
  } = options;

  return {
    onSuccess: () => {
      // Only mark clean if no changes happened since we started saving
      const lastSent = pendingSnapshotRef.current;
      const currentSnapshot = {
        nodes: serializeNodes(nodes),
        edges: serializeEdges(edges),
      };

      const mutatedWhileSaving =
        !lastSent ||
        JSON.stringify(lastSent.nodes) !==
          JSON.stringify(currentSnapshot.nodes) ||
        JSON.stringify(lastSent.edges) !==
          JSON.stringify(currentSnapshot.edges);

      if (!mutatedWhileSaving) {
        markClean();
        setLastSaved(new Date());
      }
    },
    onError: (error: { message?: string }) => {
      toast.error(errorMessage, {
        description: error.message ?? "Changes could not be saved",
      });
    },
    onSettled: () => {
      setSaving(false);
      pendingSnapshotRef.current = null;
    },
  };
}
