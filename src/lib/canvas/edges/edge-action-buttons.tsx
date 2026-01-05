"use client";

import { useCallback, useRef, useState } from "react";

import { EdgeLabelRenderer } from "@xyflow/react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type EdgeActionButtonsProps = {
  /** X position for the label */
  labelX: number;
  /** Y position for the label */
  labelY: number;
  /** Whether the edge is selected */
  selected?: boolean;
  /** Callback when add button is clicked */
  onAdd?: () => void;
  /** Callback when delete button is clicked */
  onDelete?: () => void;
  /** Whether an add operation is in progress */
  isAdding?: boolean;
  /** Title for the add button (shown on hover) */
  addTitle?: string;
  /** Title for the delete button (shown on hover) */
  deleteTitle?: string;
  /** Whether to show the add button (default: true) */
  showAdd?: boolean;
  /** Whether to show the delete button (default: true) */
  showDelete?: boolean;
  /** Delay in ms before hiding buttons after mouse leaves (default: 500) */
  hideDelay?: number;
};

/**
 * Action buttons rendered on an edge using EdgeLabelRenderer.
 *
 * Provides add and delete buttons positioned at the edge midpoint.
 * Used for adding nodes between existing nodes and removing edges.
 *
 * @example
 * ```tsx
 * const [edgePath, labelX, labelY] = getBezierPath({ ... });
 *
 * return (
 *   <>
 *     <BaseEdge id={id} path={edgePath} />
 *     <EdgeActionButtons
 *       labelX={labelX}
 *       labelY={labelY}
 *       selected={selected}
 *       onAdd={handleAddNode}
 *       onDelete={handleDeleteEdge}
 *       isAdding={isCreating}
 *       addTitle="Add role between"
 *     />
 *   </>
 * );
 * ```
 */
export function EdgeActionButtons({
  labelX,
  labelY,
  selected,
  onAdd,
  onDelete,
  isAdding,
  addTitle = "Add node",
  deleteTitle = "Delete connection",
  showAdd = true,
  showDelete = true,
  hideDelay = 500,
}: EdgeActionButtonsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showAddButton = showAdd && onAdd;
  const showDeleteButton = showDelete && onDelete;

  const clearHideTimeout = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearHideTimeout();
    setIsVisible(true);
  }, [clearHideTimeout]);

  const handleMouseLeave = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, hideDelay);
  }, [hideDelay, clearHideTimeout]);

  // Don't render anything if no buttons to show
  if (!showAddButton && !showDeleteButton) {
    return null;
  }

  return (
    <EdgeLabelRenderer>
      {/* Larger invisible hit area for easier hover detection */}
      <div
        className="nodrag nopan pointer-events-auto absolute"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          width: "80px",
          height: "80px",
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      />
      {/* Visible buttons container */}
      <div
        className={cn(
          "nodrag nopan pointer-events-auto absolute flex gap-1 transition-opacity duration-200",
          isVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {showAddButton && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            size="icon"
            variant="secondary"
            disabled={isAdding}
            className={cn(
              "hover:bg-primary hover:text-primary-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-primary",
            )}
            title={addTitle}
          >
            {isAdding ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Plus className="h-3 w-3" />
            )}
          </Button>
        )}

        {showDeleteButton && (
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            size="icon"
            variant="secondary"
            className={cn(
              "hover:bg-destructive hover:text-destructive-foreground h-6 w-6 rounded-lg border shadow-sm transition-all hover:shadow-md",
              selected && "border-destructive",
            )}
            title={deleteTitle}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </EdgeLabelRenderer>
  );
}
