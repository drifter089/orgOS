"use client";

import { useCallback } from "react";

import { Panel, useReactFlow } from "@xyflow/react";
import { Pencil, Redo2, Route, Type, Undo2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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
  const reactFlowInstance = useReactFlow();
  const addTextNode = useSystemsStore((state) => state.addTextNode);
  const setEditingTextNodeId = useSystemsStore(
    (state) => state.setEditingTextNodeId,
  );
  const isForceLayoutEnabled = useSystemsStore(
    (state) => state.isForceLayoutEnabled,
  );
  const setIsForceLayoutEnabled = useSystemsStore(
    (state) => state.setIsForceLayoutEnabled,
  );

  const handleAddText = useCallback(() => {
    takeSnapshot();
    // Get the center of the current viewport
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = -x / zoom + window.innerWidth / 2 / zoom;
    const centerY = -y / zoom + window.innerHeight / 2 / zoom;

    // Create text node at center and enter edit mode
    const nodeId = addTextNode({ x: centerX, y: centerY });
    setEditingTextNodeId(nodeId);
  }, [reactFlowInstance, addTextNode, setEditingTextNodeId, takeSnapshot]);

  return (
    <Panel
      position="bottom-left"
      className="ml-4"
      style={{ marginBottom: "80px" }} // Offset above ZoomSlider
    >
      <TooltipProvider>
        <div className="flex flex-col gap-2">
          {/* Undo/Redo buttons */}
          <div className="flex gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={undo}
                  disabled={!canUndo}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Undo (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={redo}
                  disabled={!canRedo}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50"
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Redo (Ctrl+Shift+Z)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Draw mode toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  const newDrawingState = !isDrawing;
                  setIsDrawing(newDrawingState);
                  if (newDrawingState) {
                    toast.info("Drawings are temporary and won't be saved", {
                      description:
                        "Your sketches will be cleared when you refresh the page.",
                      duration: 4000,
                    });
                  }
                }}
                variant={isDrawing ? "default" : "outline"}
                size="lg"
                className={cn(
                  "h-12 w-12 shadow-lg transition-all duration-200 hover:shadow-xl",
                  isDrawing && "ring-primary ring-2 ring-offset-2",
                )}
              >
                <Pencil className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>{isDrawing ? "Exit draw mode" : "Draw mode"}</p>
            </TooltipContent>
          </Tooltip>

          {/* Add text button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={handleAddText}
                variant="outline"
                size="lg"
                className="h-12 w-12 shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Type className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Add text</p>
            </TooltipContent>
          </Tooltip>

          {/* Force layout toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => setIsForceLayoutEnabled(!isForceLayoutEnabled)}
                variant={isForceLayoutEnabled ? "default" : "outline"}
                size="lg"
                className={cn(
                  "h-12 w-12 shadow-lg transition-all duration-200 hover:shadow-xl",
                  isForceLayoutEnabled && "ring-primary ring-2 ring-offset-2",
                )}
              >
                <Route className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>
                {isForceLayoutEnabled
                  ? "Disable auto-layout"
                  : "Enable auto-layout"}
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </Panel>
  );
}
