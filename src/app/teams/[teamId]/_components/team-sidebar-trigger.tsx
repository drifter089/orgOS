"use client";

import { ChevronLeft, ChevronRight, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TeamSidebarTriggerProps {
  roleCount: number;
  className?: string;
}

export function TeamSidebarTrigger({
  roleCount,
  className,
}: TeamSidebarTriggerProps) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="default"
            onClick={toggleSidebar}
            className={cn(
              "gap-2 shadow-sm backdrop-blur-sm",
              "transition-all duration-200 hover:shadow-md",
              className,
            )}
          >
            {/* Icon changes based on sidebar state */}
            {open ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}

            {/* Team info with role count badge */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Team Info</span>
              <Badge
                variant="secondary"
                className="h-5 min-w-[1.25rem] px-1.5 text-xs"
              >
                {roleCount}
              </Badge>
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{open ? "Hide" : "Show"} team details and actions</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
