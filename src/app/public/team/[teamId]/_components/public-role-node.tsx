"use client";

import { memo } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { TrendingUp, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  color?: string;
};

export type PublicRoleNode = Node<PublicRoleNodeData, "role-node">;

function PublicRoleNodeComponent({
  data,
  selected,
}: NodeProps<PublicRoleNode>) {
  const color = data.color ?? "#3b82f6";
  const truncatedPurpose =
    data.purpose.length > 80
      ? data.purpose.substring(0, 80) + "..."
      : data.purpose;

  return (
    <div
      className={cn(
        "bg-card group relative rounded-lg border transition-all duration-200 hover:shadow-lg",
        "max-w-[320px] min-w-[320px]",
        selected && "ring-primary ring-2 ring-offset-2",
      )}
      style={{
        borderColor: color,
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!bg-primary !border-background !h-3 !w-3 !border-2",
          "transition-transform hover:!scale-125",
        )}
      />

      <div className="nodrag absolute top-1 right-1 z-10 opacity-0 transition-opacity group-hover:opacity-100">
        <RoleViewDialog data={data} />
      </div>

      <div
        className="flex items-center gap-2 rounded-t-md px-4 py-3"
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <User className="h-5 w-5" style={{ color }} />
        <h3 className="truncate text-sm font-semibold">{data.title}</h3>
      </div>

      <div className="space-y-2 px-4 py-3">
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

        {data.assignedUserName && (
          <div className="flex items-center gap-2 border-t pt-1 text-xs">
            <User className="text-muted-foreground h-3 w-3" />
            <span className="text-muted-foreground">Assigned:</span>
            <span className="font-medium">{data.assignedUserName}</span>
          </div>
        )}
      </div>

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

export const PublicRoleNodeMemo = memo(PublicRoleNodeComponent);
