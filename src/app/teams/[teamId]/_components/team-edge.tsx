"use client";

import { useCallback, useId, useRef } from "react";

import {
  BaseEdge,
  type Edge,
  type EdgeProps,
  MarkerType,
  getBezierPath,
  useInternalNode,
} from "@xyflow/react";
import { nanoid } from "nanoid";

import { EdgeActionButtons, getFloatingEdgeParams } from "@/lib/canvas";
import { markdownToHtml } from "@/lib/utils";

import { useCreateRole } from "../hooks/use-create-role";
import { useRoleSuggestions } from "../hooks/use-role-suggestions";
import {
  type TeamEdge as TeamEdgeType,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";

export type TeamEdgeData = {
  /** When true, hides action buttons (for public views) */
  readOnly?: boolean;
};

export type TeamEdge = Edge<TeamEdgeData>;

export function TeamEdge({
  id,
  source,
  target,
  style = {},
  selected,
  data,
}: EdgeProps<TeamEdge>) {
  const markerId = useId();
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);

  const storeApi = useTeamStoreApi();
  const teamId = useTeamStore((state) => state.teamId);
  const setEdges = useTeamStore((state) => state.setEdges);
  const markDirty = useTeamStore((state) => state.markDirty);

  const { consumeNextRole } = useRoleSuggestions(teamId);

  const positionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const getNodeOptions = useCallback(() => {
    // Offset to center node on edge midpoint
    return {
      position: {
        x: positionRef.current.x - 140,
        y: positionRef.current.y - 50,
      },
    };
  }, []);

  const getEdgeOptions = useCallback(
    (_nodeId: string) => ({
      createEdges: (newNodeId: string, currentEdges: TeamEdgeType[]) => {
        const edgeIndex = currentEdges.findIndex((e) => e.id === id);
        const edge = currentEdges[edgeIndex];
        if (!edge) return currentEdges;

        // Split edge: remove old, add two new edges
        return [
          ...currentEdges.slice(0, edgeIndex),
          ...currentEdges.slice(edgeIndex + 1),
          {
            id: `edge-${edge.source}-${newNodeId}`,
            source: edge.source,
            target: newNodeId,
            type: "team-edge",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          },
          {
            id: `edge-${newNodeId}-${edge.target}`,
            source: newNodeId,
            target: edge.target,
            type: "team-edge",
            animated: true,
            markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
          },
        ];
      },
    }),
    [id],
  );

  const createRole = useCreateRole({
    teamId,
    getNodeOptions,
    getEdgeOptions,
  });

  const handleAddRole = useCallback(() => {
    const nodeId = `role-node-${nanoid(8)}`;
    const suggestion = consumeNextRole();

    if (suggestion) {
      createRole.mutate({
        teamId,
        title: suggestion.title,
        purpose: markdownToHtml(suggestion.purpose),
        accountabilities: markdownToHtml(suggestion.accountabilities),
        nodeId,
        color: suggestion.color,
      });
    } else {
      createRole.mutate({
        teamId,
        title: "New Role",
        purpose: "Define the purpose of this role",
        nodeId,
        color: "#3b82f6",
      });
    }
  }, [teamId, createRole, consumeNextRole]);

  const handleDeleteEdge = useCallback(() => {
    const currentEdges = storeApi.getState().edges;
    const newEdges = currentEdges.filter((e) => e.id !== id);
    setEdges(newEdges);
    markDirty();
  }, [storeApi, id, setEdges, markDirty]);

  // Early return after all hooks
  if (!sourceNode || !targetNode) {
    return null;
  }

  // Calculate floating edge path
  const { sx, sy, tx, ty, sourcePos, targetPos } = getFloatingEdgeParams(
    sourceNode,
    targetNode,
  );
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: sx,
    sourceY: sy,
    sourcePosition: sourcePos,
    targetX: tx,
    targetY: ty,
    targetPosition: targetPos,
  });

  // Update the position ref each render so onMutate has access to current values
  positionRef.current = { x: labelX, y: labelY };

  const isReadOnly = data?.readOnly ?? false;

  return (
    <>
      {/* Arrow marker definition with theme-aware color */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="10"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill="hsl(var(--muted-foreground))"
          />
        </marker>
      </defs>

      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          ...style,
          stroke: "hsl(var(--muted-foreground))",
          strokeWidth: selected ? 2 : 1.5,
          pointerEvents: "auto",
        }}
      />
      {!isReadOnly && (
        <EdgeActionButtons
          labelX={labelX}
          labelY={labelY}
          selected={selected}
          onAdd={handleAddRole}
          onDelete={handleDeleteEdge}
          isAdding={createRole.isPending}
          addTitle="Add role between"
        />
      )}
    </>
  );
}
