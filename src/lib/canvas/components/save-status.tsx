"use client";

import { Loader2, Save } from "lucide-react";

import { cn } from "@/lib/utils";

export type SaveStatusProps = {
  /** Whether a save operation is in progress */
  isSaving: boolean;
  /** Whether there are unsaved changes */
  isDirty: boolean;
  /** Timestamp of the last successful save */
  lastSaved: Date | null;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Save status indicator component for canvas implementations.
 *
 * Displays one of three states:
 * - Saving: Spinning loader with "Saving..." text
 * - Unsaved changes: Yellow pulsing dot with "Unsaved changes" text
 * - Saved: Green checkmark with "Saved" text
 *
 * @example
 * ```tsx
 * <SaveStatus
 *   isSaving={isSaving}
 *   isDirty={isDirty}
 *   lastSaved={lastSaved}
 * />
 * ```
 */
export function SaveStatus({
  isSaving,
  isDirty,
  lastSaved,
  className,
}: SaveStatusProps) {
  // Don't render if there's nothing to show
  if (!isSaving && !isDirty && !lastSaved) {
    return null;
  }

  return (
    <div
      className={cn(
        "supports-backdrop-filter:bg-background/60 bg-background/95",
        "ring-border/50 rounded-md border px-3 py-2 shadow-md ring-1 backdrop-blur-sm",
        className,
      )}
    >
      {isSaving ? (
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
          <span className="font-medium">Saving...</span>
        </div>
      ) : isDirty ? (
        <div className="flex items-center gap-2 text-sm">
          <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
          <span className="text-muted-foreground font-medium">
            Unsaved changes
          </span>
        </div>
      ) : lastSaved ? (
        <div className="flex items-center gap-2 text-sm">
          <Save className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-muted-foreground font-medium">Saved</span>
        </div>
      ) : null}
    </div>
  );
}
