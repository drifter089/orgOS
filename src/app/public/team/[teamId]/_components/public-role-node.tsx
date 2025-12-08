"use client";

import { memo } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Gauge, TrendingUp, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { stripHtml } from "@/lib/html-utils";
import { cn } from "@/lib/utils";

import { RoleViewDialog } from "./role-view-dialog";

export type PublicRoleNodeData = {
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
};

export type PublicRoleNode = Node<PublicRoleNodeData, "role-node">;

function PublicRoleNodeComponent({
  data,
  selected,
}: NodeProps<PublicRoleNode>) {
  const color = data.color ?? "#3b82f6";

  // Strip HTML and truncate for display
  const plainPurpose = stripHtml(data.purpose);
  const truncatedPurpose =
    plainPurpose.length > 100
      ? plainPurpose.substring(0, 100) + "..."
      : plainPurpose;

  return (
    <div
      className={cn(
        "bg-card group relative flex flex-col rounded-lg border transition-all duration-200 hover:shadow-lg",
        "h-[160px] w-[320px]",
        selected && "ring-primary ring-2 ring-offset-2",
      )}
      style={{
        borderColor: color,
      }}
    >
      {/* Top Handles - Bidirectional */}
      <Handle
        type="target"
        position={Position.Top}
        id="top-target"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ left: "45%" }}
      />
      <Handle
        type="source"
        position={Position.Top}
        id="top-source"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ left: "55%" }}
      />

      {/* Right Handles - Bidirectional */}
      <Handle
        type="target"
        position={Position.Right}
        id="right-target"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ top: "45%" }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right-source"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ top: "55%" }}
      />

      <div className="nodrag absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <RoleViewDialog data={data} />
      </div>

      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2"
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <User className="h-5 w-5" style={{ color }} />
        <h3 className="truncate text-sm font-semibold">{data.title}</h3>
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

      {/* Bottom Handles - Bidirectional */}
      <Handle
        type="target"
        position={Position.Bottom}
        id="bottom-target"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ left: "45%" }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom-source"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ left: "55%" }}
      />

      {/* Left Handles - Bidirectional */}
      <Handle
        type="target"
        position={Position.Left}
        id="left-target"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ top: "45%" }}
      />
      <Handle
        type="source"
        position={Position.Left}
        id="left-source"
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
        style={{ top: "55%" }}
      />
    </div>
  );
}

export const PublicRoleNodeMemo = memo(PublicRoleNodeComponent);
