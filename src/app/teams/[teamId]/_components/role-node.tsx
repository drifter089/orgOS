"use client";

import { memo, useCallback, useState } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Loader2, Settings, Trash2, TrendingUp, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  const truncatedPurpose =
    data.purpose.length > 80
      ? data.purpose.substring(0, 80) + "..."
      : data.purpose;

  const isPending = data.isPending ?? false;

  return (
    <div
      className={cn(
        "bg-card group relative rounded-lg border transition-all duration-200 hover:shadow-lg",
        "max-w-[320px] min-w-[320px]",
        selected && "ring-primary ring-2 ring-offset-2",
        isPending && "cursor-not-allowed opacity-60",
        isDeleting && "opacity-50",
      )}
      style={{
        borderColor: color,
      }}
    >
      {/* Top Handle */}
      <Handle
        type="target"
        position={Position.Top}
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
        className="flex items-center gap-2 rounded-t-md px-4 py-3"
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
      <div className="space-y-2 px-4 py-3">
        {/* Purpose */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-muted-foreground line-clamp-2 text-xs">
                {truncatedPurpose}
              </p>
            </TooltipTrigger>
            {data.purpose.length > 80 && (
              <TooltipContent className="max-w-xs">
                <p className="text-xs">{data.purpose}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>

        {/* Metric */}
        {data.metricName && (
          <div className="flex items-center gap-2 text-xs">
            <TrendingUp className="text-muted-foreground h-3 w-3" />
            <span className="font-medium">{data.metricName}</span>
            {data.metricValue !== undefined && data.metricValue !== null && (
              <Badge variant="secondary" className="text-xs">
                {data.metricValue.toFixed(1)} {data.metricUnit ?? ""}
              </Badge>
            )}
          </div>
        )}

        {/* Assigned User */}
        {data.assignedUserName && (
          <div className="flex items-center gap-2 border-t pt-1 text-xs">
            <User className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground">Assigned:</span>
            <span className="font-medium">{data.assignedUserName}</span>
          </div>
        )}
      </div>

      {/* Bottom Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />
    </div>
  );
}

export const RoleNodeMemo = memo(RoleNodeComponent);
