"use client";

import { useCallback, useEffect, useState } from "react";

import { type Edge, type Node, useReactFlow } from "@xyflow/react";

type UseUndoRedoOptions = {
  /** Maximum number of history states to keep. Default: 100 */
  maxHistorySize?: number;
  /** Enable keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z). Default: true */
  enableShortcuts?: boolean;
};

type HistoryItem<TNode extends Node, TEdge extends Edge> = {
  nodes: TNode[];
  edges: TEdge[];
};

type UseUndoRedoReturn = {
  /** Undo the last action */
  undo: () => void;
  /** Redo the last undone action */
  redo: () => void;
  /** Take a snapshot of current state before making changes */
  takeSnapshot: () => void;
  /** Whether there are states to undo */
  canUndo: boolean;
  /** Whether there are states to redo */
  canRedo: boolean;
};

const defaultOptions: Required<UseUndoRedoOptions> = {
  maxHistorySize: 100,
  enableShortcuts: true,
};

/**
 * Hook for undo/redo functionality in React Flow canvases.
 *
 * Usage:
 * 1. Call takeSnapshot() BEFORE any state-modifying operation
 * 2. Use canUndo/canRedo to disable buttons when unavailable
 * 3. Keyboard shortcuts are enabled by default (Ctrl+Z, Ctrl+Shift+Z)
 *
 * @example
 * ```tsx
 * const { undo, redo, takeSnapshot, canUndo, canRedo } = useUndoRedo();
 *
 * // Before adding a node
 * takeSnapshot();
 * setNodes([...nodes, newNode]);
 *
 * // In event handlers
 * <ReactFlow
 *   onNodeDragStart={takeSnapshot}
 *   onNodesDelete={() => { takeSnapshot(); ... }}
 * />
 * ```
 */
export function useUndoRedo<
  TNode extends Node = Node,
  TEdge extends Edge = Edge,
>(options: UseUndoRedoOptions = {}): UseUndoRedoReturn {
  const { maxHistorySize, enableShortcuts } = {
    ...defaultOptions,
    ...options,
  };

  // History stacks
  const [past, setPast] = useState<HistoryItem<TNode, TEdge>[]>([]);
  const [future, setFuture] = useState<HistoryItem<TNode, TEdge>[]>([]);

  const { setNodes, setEdges, getNodes, getEdges } = useReactFlow<
    TNode,
    TEdge
  >();

  const takeSnapshot = useCallback(() => {
    // Push current state to past
    setPast((past) => [
      ...past.slice(past.length - maxHistorySize + 1, past.length),
      { nodes: getNodes(), edges: getEdges() },
    ]);

    // Clear future when new action is taken
    setFuture([]);
  }, [getNodes, getEdges, maxHistorySize]);

  const undo = useCallback(() => {
    const pastState = past[past.length - 1];

    if (pastState) {
      // Remove from past
      setPast((past) => past.slice(0, past.length - 1));
      // Store current state in future for redo
      setFuture((future) => [
        ...future,
        { nodes: getNodes(), edges: getEdges() },
      ]);
      // Restore past state
      setNodes(pastState.nodes);
      setEdges(pastState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, past]);

  const redo = useCallback(() => {
    const futureState = future[future.length - 1];

    if (futureState) {
      // Remove from future
      setFuture((future) => future.slice(0, future.length - 1));
      // Store current state in past
      setPast((past) => [...past, { nodes: getNodes(), edges: getEdges() }]);
      // Restore future state
      setNodes(futureState.nodes);
      setEdges(futureState.edges);
    }
  }, [setNodes, setEdges, getNodes, getEdges, future]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!enableShortcuts) {
      return;
    }

    const keyDownHandler = (event: KeyboardEvent) => {
      if (
        event.key?.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey) &&
        event.shiftKey
      ) {
        event.preventDefault();
        redo();
      } else if (
        event.key?.toLowerCase() === "z" &&
        (event.ctrlKey || event.metaKey)
      ) {
        event.preventDefault();
        undo();
      }
    };

    document.addEventListener("keydown", keyDownHandler);

    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, [undo, redo, enableShortcuts]);

  return {
    undo,
    redo,
    takeSnapshot,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  };
}
