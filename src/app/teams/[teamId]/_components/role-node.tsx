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

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stripHtml } from "@/lib/html-utils";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import type { ChartTransformResult } from "@/lib/metrics/transformer-types";
import { cn } from "@/lib/utils";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";

import { useDeleteRole } from "../hooks/use-delete-role";
import { useRoleData, useUserName } from "../hooks/use-role-data";
import { useTeamStore } from "../store/team-store";

/**
 * Minimal data stored in node.data - just a reference to the role.
 * All display data comes from TanStack Query cache via useRoleData hook.
 */
export type RoleNodeData = {
  roleId: string;
  /** Only set during optimistic create, before server confirms */
  isPending?: boolean;
  /** Temporary title during optimistic create (used until cache is populated) */
  pendingTitle?: string;
  /** Temporary color during optimistic create */
  pendingColor?: string;
  /** When true, hides edit/delete buttons and disables interactions (for public views) */
  readOnly?: boolean;
};

export type RoleNode = Node<RoleNodeData, "role-node">;

function RoleNodeComponent({ data, selected, id }: NodeProps<RoleNode>) {
  const [isDeleting, setIsDeleting] = useState(false);

  const teamId = useTeamStore((state) => state.teamId);
  const setEditingNodeId = useTeamStore((state) => state.setEditingNodeId);
  const { confirm } = useConfirmation();
  const deleteRoleMutation = useDeleteRole(teamId);

  // Fetch role data from TanStack Query cache
  const role = useRoleData(data.roleId);
  const assignedUserName = useUserName(role?.assignedUserId);

  // Use pending data during optimistic create, otherwise use cache
  const isPending = data.isPending ?? false;
  const title = role?.title ?? data.pendingTitle ?? "Untitled Role";
  const purpose = role?.purpose ?? "";
  const color = role?.color ?? data.pendingColor ?? "#3b82f6";
  const metricName = role?.metric?.name;
  const effortPoints = role?.effortPoints;

  const dashboardCharts = role?.metric?.dashboardCharts;
  const chartConfig = dashboardCharts?.[0]
    ?.chartConfig as ChartTransformResult | null;
  const latestMetric = getLatestMetricValue(chartConfig);
  const metricValue = latestMetric?.value;
  const metricDate = latestMetric?.date;
  const isValueLoading = metricName && dashboardCharts?.length === 0;

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: "Delete role",
      description: `Are you sure you want to delete "${title}"? This will also remove it from the canvas.`,
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
  }, [data.roleId, title, deleteRoleMutation, confirm]);

  const handleEdit = useCallback(() => {
    setEditingNodeId(id);
  }, [setEditingNodeId, id]);

  // Strip HTML and truncate for display
  const plainPurpose = stripHtml(purpose);
  const truncatedPurpose =
    plainPurpose.length > 100
      ? plainPurpose.substring(0, 100) + "..."
      : plainPurpose;

  // Double-click to edit (only if not pending and not readOnly)
  const handleDoubleClick = useCallback(() => {
    if (!isPending && !data.readOnly) {
      setEditingNodeId(id);
    }
  }, [isPending, data.readOnly, setEditingNodeId, id]);

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

      {/* Action Buttons - Positioned in top-right corner (hidden in readOnly mode) */}
      {!isPending && !data.readOnly && (
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
        <h3 className="truncate text-sm font-semibold">{title}</h3>
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
          {metricName && (
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs">
                <TrendingUp className="text-muted-foreground h-3 w-3 shrink-0" />
                <span className="truncate font-medium">{metricName}</span>
                {isValueLoading ? (
                  <Loader2 className="text-muted-foreground ml-auto h-3 w-3 shrink-0 animate-spin" />
                ) : metricValue !== undefined ? (
                  <span className="text-primary ml-auto shrink-0 font-semibold">
                    {Number.isInteger(metricValue)
                      ? metricValue
                      : metricValue.toFixed(1)}
                  </span>
                ) : null}
              </div>
              {metricDate && (
                <p className="text-muted-foreground/70 pl-5 text-[10px]">
                  {metricDate}
                </p>
              )}
            </div>
          )}

          {/* Assigned User */}
          {assignedUserName && (
            <div className="flex items-center gap-2 text-xs">
              <User className="text-muted-foreground h-3 w-3 shrink-0" />
              <span className="truncate font-medium">{assignedUserName}</span>
            </div>
          )}
        </div>
      </div>

      {/* Footer - Effort Points */}
      {effortPoints && (
        <div className="border-border/50 shrink-0 border-t px-4 py-1.5">
          <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <Gauge className="h-3.5 w-3.5" />
            <span>
              {effortPoints} {effortPoints === 1 ? "point" : "points"}
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
