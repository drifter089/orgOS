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
              "supports-backdrop-filter:bg-background/60 bg-background/95 gap-2 shadow-md backdrop-blur-sm",
              "ring-border/50 hover:ring-border ring-1 transition-all duration-200 hover:shadow-lg",
              className,
            )}
          >
            {/* Icon changes based on sidebar state with smooth transition */}
            <div className="transition-transform duration-200">
              {open ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </div>

            {/* Team info with role count badge */}
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden font-medium sm:inline">Team Info</span>
              <Badge
                variant="secondary"
                className="h-5 min-w-[1.25rem] px-1.5 text-xs font-semibold"
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
