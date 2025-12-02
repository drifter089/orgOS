"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface DashboardSheetEdgeTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  side?: "left" | "right";
  className?: string;
}

export function DashboardSheetEdgeTrigger({
  isOpen,
  onToggle,
  side = "right",
  className,
}: DashboardSheetEdgeTriggerProps) {
  const isLeft = side === "left";

  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed top-1/2 z-[51] -translate-y-1/2",
        "flex items-center gap-2 px-3 py-2",
        "rounded-lg border",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300 ease-in-out",
        isOpen
          ? "bg-background/60 hover:bg-background/80 backdrop-blur-md"
          : "bg-primary text-primary-foreground border-primary hover:brightness-110",
        isLeft
          ? isOpen
            ? "left-[39.5rem]"
            : "left-4"
          : isOpen
            ? "right-[39.5rem]"
            : "right-4",
        className,
      )}
      aria-label={isOpen ? "Close KPIs sidebar" : "Open KPIs sidebar"}
    >
      {isLeft ? (
        <>
          {isOpen ? (
            <ChevronLeft className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">KPIs</span>
        </>
      ) : (
        <>
          <span className="text-sm font-medium">KPIs</span>
          {isOpen ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </>
      )}
    </button>
  );
}
