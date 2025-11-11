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

export type RoleNodeData = {
  roleId: string;
  title: string;
  purpose: string;
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

function RoleNodeComponent({ data, selected }: NodeProps<RoleNode>) {
  const color = data.color ?? "#3b82f6";
  const truncatedPurpose =
    data.purpose.length > 50
      ? data.purpose.substring(0, 50) + "..."
      : data.purpose;

  const isPending = data.isPending ?? false;

  return (
    <div
      className={cn(
        "bg-card rounded-lg border-2 transition-all duration-200 hover:shadow-lg",
        "max-w-[280px] min-w-[280px]",
        selected && "ring-primary ring-2 ring-offset-2",
        isPending && "cursor-not-allowed opacity-60",
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
            {data.purpose.length > 50 && (
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
            <span className="text-muted-foreground">{data.metricName}:</span>
            <Badge variant="secondary" className="text-xs">
              {data.metricValue !== undefined && data.metricValue !== null
                ? `${data.metricValue.toFixed(1)} ${data.metricUnit ?? ""}`
                : "N/A"}
            </Badge>
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
