"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface TeamSheetEdgeTriggerProps {
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

export function TeamSheetEdgeTrigger({
  isOpen,
  onToggle,
  className,
}: TeamSheetEdgeTriggerProps) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "fixed top-1/2 z-50 -translate-y-1/2",
        "flex items-center gap-2 px-3 py-2",
        "rounded-lg border",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-300 ease-in-out",
        isOpen
          ? "bg-background/60 hover:bg-background/80 backdrop-blur-md"
          : "bg-primary text-primary-foreground border-primary hover:brightness-110",
        isOpen ? "right-[23.5rem]" : "right-4",
        className,
      )}
      aria-label={isOpen ? "Close Roles sidebar" : "Open Roles sidebar"}
    >
      <span className="text-sm font-medium">Roles</span>
      {isOpen ? (
        <ChevronRight className="h-4 w-4" />
      ) : (
        <ChevronLeft className="h-4 w-4" />
      )}
    </button>
  );
}
