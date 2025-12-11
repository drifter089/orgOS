"use client";

import { CanvasControls } from "@/lib/canvas";

import { useTeamStore } from "../store/team-store";

type TeamCanvasControlsProps = {
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  takeSnapshot: () => void;
};

/**
 * Controls for the team canvas - provides auto-layout, text node creation,
 * drawing mode toggle, and undo/redo buttons.
 */
export function TeamCanvasControls({
  isDrawing,
  setIsDrawing,
  undo,
  redo,
  canUndo,
  canRedo,
  takeSnapshot,
}: TeamCanvasControlsProps) {
  const actions = {
    addTextNode: useTeamStore((s) => s.addTextNode),
    setEditingTextNodeId: useTeamStore((s) => s.setEditingTextNodeId),
    isForceLayoutEnabled: useTeamStore((s) => s.isForceLayoutEnabled),
    setIsForceLayoutEnabled: useTeamStore((s) => s.setIsForceLayoutEnabled),
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
      showAddTextShortcut
    />
  );
}
