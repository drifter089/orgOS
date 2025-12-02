"use client";

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
}: EdgeActionButtonsProps) {
  const showAddButton = showAdd && onAdd;
  const showDeleteButton = showDelete && onDelete;

  // Don't render anything if no buttons to show
  if (!showAddButton && !showDeleteButton) {
    return null;
  }

  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan pointer-events-auto absolute flex gap-1"
        style={{
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }}
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
