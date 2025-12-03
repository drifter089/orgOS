"use client";

import { useCallback, useEffect, useState } from "react";

import { type Node, useReactFlow } from "@xyflow/react";

import { type FreehandNodeType } from "../freehand";

type UseDrawingUndoRedoOptions = {
  /** Maximum number of drawing history states to keep. Default: 50 */
  maxHistorySize?: number;
  /** Enable keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z). Default: true */
  enableShortcuts?: boolean;
};

type DrawingHistoryItem = {
  freehandNodes: FreehandNodeType[];
};

type UseDrawingUndoRedoReturn = {
  /** Undo the last drawing action */
  undo: () => void;
  /** Redo the last undone drawing action */
  redo: () => void;
  /** Take a snapshot of current drawing state before making changes */
  takeSnapshot: () => void;
  /** Whether there are drawing states to undo */
  canUndo: boolean;
  /** Whether there are drawing states to redo */
  canRedo: boolean;
};

const defaultOptions: Required<UseDrawingUndoRedoOptions> = {
  maxHistorySize: 50,
  enableShortcuts: true,
};

/**
 * Hook for undo/redo functionality specifically for freehand drawings.
 * Only tracks freehand node changes - other node types are preserved.
 * This allows drawings to be session-only while maintaining undo/redo.
 */
export function useDrawingUndoRedo<TNode extends Node = Node>(
  options: UseDrawingUndoRedoOptions = {},
): UseDrawingUndoRedoReturn {
  const { maxHistorySize, enableShortcuts } = {
    ...defaultOptions,
    ...options,
  };

  const [past, setPast] = useState<DrawingHistoryItem[]>([]);
  const [future, setFuture] = useState<DrawingHistoryItem[]>([]);

  const { setNodes, getNodes } = useReactFlow<TNode>();

  const getFreehandNodes = useCallback((): FreehandNodeType[] => {
    return getNodes().filter(
      (node): node is TNode & FreehandNodeType => node.type === "freehand",
    ) as unknown as FreehandNodeType[];
  }, [getNodes]);

  const getNonFreehandNodes = useCallback((): TNode[] => {
    return getNodes().filter((node) => node.type !== "freehand");
  }, [getNodes]);

  const takeSnapshot = useCallback(() => {
    const currentFreehandNodes = getFreehandNodes();
    setPast((past) => [
      ...past.slice(past.length - maxHistorySize + 1, past.length),
      { freehandNodes: currentFreehandNodes },
    ]);
    setFuture([]);
  }, [getFreehandNodes, maxHistorySize]);

  const undo = useCallback(() => {
    const pastState = past[past.length - 1];

    if (pastState) {
      const currentFreehandNodes = getFreehandNodes();
      const nonFreehandNodes = getNonFreehandNodes();

      setPast((past) => past.slice(0, past.length - 1));
      setFuture((future) => [
        ...future,
        { freehandNodes: currentFreehandNodes },
      ]);

      setNodes([
        ...nonFreehandNodes,
        ...(pastState.freehandNodes as unknown as TNode[]),
      ]);
    }
  }, [past, getFreehandNodes, getNonFreehandNodes, setNodes]);

  const redo = useCallback(() => {
    const futureState = future[future.length - 1];

    if (futureState) {
      const currentFreehandNodes = getFreehandNodes();
      const nonFreehandNodes = getNonFreehandNodes();

      setFuture((future) => future.slice(0, future.length - 1));
      setPast((past) => [...past, { freehandNodes: currentFreehandNodes }]);

      setNodes([
        ...nonFreehandNodes,
        ...(futureState.freehandNodes as unknown as TNode[]),
      ]);
    }
  }, [future, getFreehandNodes, getNonFreehandNodes, setNodes]);

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
