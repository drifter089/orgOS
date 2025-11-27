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
      className="ml-4"
      style={{ marginBottom: "80px" }} // Offset above ZoomSlider
    >
      <TooltipProvider>
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
      </TooltipProvider>
    </Panel>
  );
}
