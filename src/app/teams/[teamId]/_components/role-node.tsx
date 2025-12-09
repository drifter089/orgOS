"use client";

import { memo, useCallback, useState } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import {
  Gauge,
  Loader2,
  Settings,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stripHtml } from "@/lib/html-utils";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";

import { useDeleteRole } from "../hooks/use-delete-role";
import { useTeamStore } from "../store/team-store";

export type RoleNodeData = {
  roleId: string;
  title: string;
  purpose: string;
  accountabilities?: string;
  metricId?: string;
  metricName?: string;
  metricValue?: number;
  metricUnit?: string;
  assignedUserId?: string | null;
  assignedUserName?: string;
  effortPoints?: number | null;
  color?: string;
  isPending?: boolean;
};

export type RoleNode = Node<RoleNodeData, "role-node">;

function RoleNodeComponent({ data, selected, id }: NodeProps<RoleNode>) {
  const [isDeleting, setIsDeleting] = useState(false);

  const teamId = useTeamStore((state) => state.teamId);
  const setEditingNodeId = useTeamStore((state) => state.setEditingNodeId);
  const { confirm } = useConfirmation();
  const deleteRoleMutation = useDeleteRole(teamId);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: "Delete role",
      description: `Are you sure you want to delete "${data.title}"? This will also remove it from the canvas.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      setIsDeleting(true);
      deleteRoleMutation.mutate(
        { id: data.roleId },
        { onSettled: () => setIsDeleting(false) },
      );
    }
  }, [data.roleId, data.title, deleteRoleMutation, confirm]);

  const handleEdit = useCallback(() => {
    setEditingNodeId(id);
  }, [setEditingNodeId, id]);

  const color = data.color ?? "#3b82f6";

  // Strip HTML and truncate for display
  const plainPurpose = stripHtml(data.purpose);
  const truncatedPurpose =
    plainPurpose.length > 100
      ? plainPurpose.substring(0, 100) + "..."
      : plainPurpose;

  const isPending = data.isPending ?? false;

  // Double-click to edit (only if not pending)
  const handleDoubleClick = useCallback(() => {
    if (!isPending) {
      setEditingNodeId(id);
    }
  }, [isPending, setEditingNodeId, id]);

  return (
    <div
      className={cn(
        "bg-card group relative flex flex-col rounded-lg border transition-all duration-200 hover:shadow-lg",
        "h-[160px] w-[320px]",
        selected && "ring-primary ring-2 ring-offset-2",
        isPending && "opacity-70",
        isDeleting && "opacity-50",
      )}
      style={{
        borderColor: color,
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Single handle per side - floating edges calculate best connection point */}
      <Handle
        type="source"
        position={Position.Top}
        id="top"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />

      {/* Action Buttons - Positioned in top-right corner */}
      {!isPending && (
        <div className="nodrag absolute top-1 right-1 z-10 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}
            className={cn("h-6 w-6", "hover:bg-primary/10 hover:text-primary")}
            title="Edit role"
          >
            <Settings className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              void handleDelete();
            }}
            disabled={isDeleting}
            className={cn(
              "h-6 w-6",
              "hover:bg-destructive/10 hover:text-destructive",
            )}
            title="Delete role"
          >
            {isDeleting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Trash2 className="h-3 w-3" />
            )}
          </Button>
        </div>
      )}

      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2"
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <User className="h-5 w-5" style={{ color }} />
        <h3 className="truncate text-sm font-semibold">{data.title}</h3>
        {isPending && (
          <div className="ml-auto flex items-center gap-1">
            <div className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full" />
            <div
              className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="bg-primary h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-4 py-2">
        {/* Purpose */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {truncatedPurpose}
              </p>
            </TooltipTrigger>
            {plainPurpose.length > 100 && (
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{plainPurpose}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Metric & Assigned User - at bottom */}
        <div className="mt-auto space-y-1">
          {/* Metric */}
          {data.metricName && (
            <div className="flex items-center gap-2 text-xs">
              <TrendingUp className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{data.metricName}</span>
              {data.metricValue !== undefined && data.metricValue !== null && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {data.metricValue.toFixed(1)} {data.metricUnit ?? ""}
                </Badge>
              )}
            </div>
          )}

          {/* Assigned User */}
          {data.assignedUserName && (
            <div className="flex items-center gap-2 text-xs">
              <User className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate font-medium">
                {data.assignedUserName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Effort Points */}
      {data.effortPoints && (
        <div className="border-border/50 shrink-0 border-t px-4 py-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            <span>
              {data.effortPoints} {data.effortPoints === 1 ? "point" : "points"}
            </span>
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />
    </div>
  );
}

export const RoleNodeMemo = memo(RoleNodeComponent);
