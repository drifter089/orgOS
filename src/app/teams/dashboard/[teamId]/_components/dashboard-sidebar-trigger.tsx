"use client";

import { ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardSidebarTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Circular animated button on the edge of the sidebar sheet
 * Positioned in the middle of the right edge with eye-catching design
 */
export function DashboardSidebarTrigger({
  isOpen,
  onToggle,
  className,
}: DashboardSidebarTriggerProps) {
  return (
    <Button
      onClick={onToggle}
      size="icon"
      className={cn(
        // Base styles - prominent but not too large
        "fixed top-1/2 z-50 h-10 w-10 -translate-y-1/2 rounded-full",
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
        // Position based on sheet state
        isOpen ? "right-[23.5rem]" : "right-4",
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
