"use client";

import { memo } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Gauge, Loader2, TrendingUp, User } from "lucide-react";

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

import {
  type PublicRoleData,
  usePublicRoleData,
} from "../../../_hooks/use-public-role-data";

export type PublicRoleNodeData = {
  roleId: string;
};

export type PublicRoleNode = Node<PublicRoleNodeData, "role-node">;

function PublicRoleNodeComponent({
  data,
  selected,
}: NodeProps<PublicRoleNode>) {
  const role: PublicRoleData | undefined = usePublicRoleData(data.roleId);

  const title = role?.title ?? "Untitled Role";
  const purpose = role?.purpose ?? "";
  const color = role?.color ?? "#3b82f6";
  const metricName = role?.metric?.name;
  const effortPoints = role?.effortPoints;

  const dashboardCharts = role?.metric?.dashboardCharts;
  const chartConfig = dashboardCharts?.[0]?.chartConfig as
    | ChartTransformResult
    | null
    | undefined;
  const latestMetric = getLatestMetricValue(chartConfig ?? null);
  const metricValue = latestMetric?.value;
  const metricDate = latestMetric?.date;
  const isValueLoading = Boolean(metricName && dashboardCharts?.length === 0);

  const plainPurpose = stripHtml(purpose);
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

      <div
        className="flex shrink-0 items-center gap-2 rounded-t-md px-4 py-2"
        style={{
          backgroundColor: `${color}15`,
        }}
      >
        <User className="h-5 w-5" style={{ color }} />
        <h3 className="truncate text-sm font-semibold">{title}</h3>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden px-4 py-2">
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

        <div className="mt-auto space-y-1">
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
        </div>
      </div>

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

export const PublicRoleNodeMemo = memo(PublicRoleNodeComponent);
