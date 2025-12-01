"use client";

import { useCallback } from "react";

import { Panel, useReactFlow } from "@xyflow/react";
import { Route, Type } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTeamLayout } from "../hooks/use-team-layout";
import { useTeamStore } from "../store/team-store";

/**
 * Controls for the team canvas - provides auto-layout and text node creation
 */
export function TeamCanvasControls() {
  const runLayout = useTeamLayout();
  const reactFlowInstance = useReactFlow();
  const addTextNode = useTeamStore((state) => state.addTextNode);
  const setEditingTextNodeId = useTeamStore(
    (state) => state.setEditingTextNodeId,
  );

  const handleAddText = useCallback(() => {
    // Get the center of the current viewport
    const { x, y, zoom } = reactFlowInstance.getViewport();
    const centerX = -x / zoom + window.innerWidth / 2 / zoom;
    const centerY = -y / zoom + window.innerHeight / 2 / zoom;

    // Create text node at center and enter edit mode
    const nodeId = addTextNode({ x: centerX, y: centerY });
    setEditingTextNodeId(nodeId);
  }, [reactFlowInstance, addTextNode, setEditingTextNodeId]);

  return (
    <Panel
      position="bottom-left"
      className="ml-4"
      style={{ marginBottom: "80px" }} // Offset above ZoomSlider
    >
      <TooltipProvider>
        <div className="flex flex-col gap-2">
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={runLayout}
                variant="default"
                size="lg"
                className="h-12 w-12 shadow-lg transition-all duration-200 hover:shadow-xl"
              >
                <Route className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Force layout</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </Panel>
  );
}
