"use client";

import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSheetEdgeTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Circular animated button on the edge of the sidebar sheet
 * Positioned in the middle of the right edge with eye-catching design
 */
export function DashboardSheetEdgeTrigger({
  isOpen,
  onToggle,
  className,
}: DashboardSheetEdgeTriggerProps) {
  return (
    <Button
      onClick={onToggle}
      size="icon"
      className={cn(
        // Base styles - prominent but not too large
        // z-[51]: Same level as sidebar, above navbar (z-50), below modals (z-[60])
        "fixed top-1/2 z-[51] h-10 w-10 -translate-y-1/2 rounded-full",
        "bg-primary text-primary-foreground border-primary border-2",
        // Shadow for depth
        "shadow-xl hover:shadow-2xl",
        // Smooth transitions
        "transition-all duration-300 ease-in-out",
        // Hover effects
        "hover:scale-110 hover:brightness-110",
        // Pulse animation to draw attention
        "animate-pulse hover:animate-none",
        // Ring effect for extra visibility
        "ring-primary/20 ring-offset-background ring-2 ring-offset-2",
        // Position based on sheet state - wider sidebar (40rem = 640px)
        isOpen ? "right-[39.5rem]" : "right-4",
        className,
      )}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
      style={{
        animationDuration: "2.5s",
        animationIterationCount: "infinite",
      }}
    >
      {/* Single icon that rotates 180 degrees */}
      <ChevronRight
        className={cn(
          "h-5 w-5 transition-transform duration-300 ease-in-out",
          // Rotate 180 degrees when open (arrow points left to close)
          isOpen && "rotate-180",
        )}
      />
    </Button>
  );
}
