"use client";

import { Panel } from "@xyflow/react";
import { Route } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useTeamLayout } from "../hooks/use-team-layout";

/**
 * Controls for the team canvas - provides auto-layout functionality
 */
export function TeamCanvasControls() {
  const runLayout = useTeamLayout();

  return (
    <Panel
      position="bottom-left"
      className="bg-card text-foreground ml-4 rounded-md"
      style={{ marginBottom: "64px" }} // Offset above ZoomSlider
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button onClick={runLayout} variant="ghost" size="icon">
              <Route className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Auto-arrange roles</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </Panel>
  );
}
