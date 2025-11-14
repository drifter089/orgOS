"use client";

import { memo, useCallback, useState } from "react";

import { Handle, type Node, type NodeProps, Position } from "@xyflow/react";
import { Loader2, Trash2, TrendingUp, User } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useTeamStore } from "../store/team-store";

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
  const [isDeleting, setIsDeleting] = useState(false);

  const teamId = useTeamStore((state) => state.teamId);
  const nodes = useTeamStore((state) => state.nodes);
  const edges = useTeamStore((state) => state.edges);
  const setNodes = useTeamStore((state) => state.setNodes);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);

  const utils = api.useUtils();

  const deleteRole = api.role.delete.useMutation({
    onMutate: async (variables) => {
      setIsDeleting(true);
      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const previousNodes = nodes;
      const previousEdges = edges;

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [];
        return old.filter((role) => role.id !== variables.id);
      });

      // Find the node ID for this role
      const nodeToRemove = nodes.find(
        (node) => node.data.roleId === data.roleId,
      );
      if (nodeToRemove) {
        // Remove the node and its connected edges
        const updatedNodes = nodes.filter(
          (node) => node.id !== nodeToRemove.id,
        );
        const updatedEdges = edges.filter(
          (edge) =>
            edge.source !== nodeToRemove.id && edge.target !== nodeToRemove.id,
        );
        setNodes(updatedNodes);
        setEdges(updatedEdges);
        markDirty();
      }

      return { previousRoles, previousNodes, previousEdges };
    },
    onError: (error, _variables, context) => {
      toast.error("Failed to delete role", {
        description: error.message ?? "An unexpected error occurred",
      });
      if (context?.previousRoles !== undefined) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes && context?.previousEdges) {
        setNodes(context.previousNodes);
        setEdges(context.previousEdges);
      }
      setIsDeleting(false);
    },
    onSettled: () => {
      void utils.role.getByTeam.invalidate({ teamId });
      setIsDeleting(false);
    },
  });

  const handleDelete = useCallback(() => {
    if (
      confirm(
        `Are you sure you want to delete the role "${data.title}"? This will also remove it from the canvas.`,
      )
    ) {
      deleteRole.mutate({ id: data.roleId });
    }
  }, [data.roleId, data.title, deleteRole]);

  const color = data.color ?? "#3b82f6";
  const truncatedPurpose =
    data.purpose.length > 50
      ? data.purpose.substring(0, 50) + "..."
      : data.purpose;

  const isPending = data.isPending ?? false;

  return (
    <div
      className={cn(
        "bg-card group relative rounded-lg border transition-all duration-200 hover:shadow-lg",
        "max-w-[280px] min-w-[280px]",
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

      {/* Delete Button - Positioned in top-right corner */}
      {!isPending && (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className={cn(
            "nodrag absolute top-1 right-1 z-10 h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100",
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
