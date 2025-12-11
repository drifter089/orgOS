"use client";

import { CanvasControls } from "@/lib/canvas";

import { useSystemsStore } from "../store/systems-store";

type SystemsCanvasControlsProps = {
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: () => void;
};

/**
 * Controls for the systems canvas - provides drawing mode toggle, undo/redo,
 * text node creation, and force layout buttons.
 */
export function SystemsCanvasControls({
  isDrawing,
  setIsDrawing,
  undo,
  redo,
  canUndo,
  canRedo,
  takeSnapshot,
}: SystemsCanvasControlsProps) {
  const actions = {
    addTextNode: useSystemsStore((s) => s.addTextNode),
    setEditingTextNodeId: useSystemsStore((s) => s.setEditingTextNodeId),
    isForceLayoutEnabled: useSystemsStore((s) => s.isForceLayoutEnabled),
    setIsForceLayoutEnabled: useSystemsStore((s) => s.setIsForceLayoutEnabled),
  };

  return (
    <CanvasControls
      isDrawing={isDrawing}
      setIsDrawing={setIsDrawing}
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
      takeSnapshot={takeSnapshot}
      actions={actions}
    />
  );
}
