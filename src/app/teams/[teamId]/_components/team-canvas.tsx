"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  type FinalConnectionState,
  MarkerType,
  type Node,
  type ProOptions,
  ReactFlow,
  SelectionMode,
  useReactFlow,
  useStoreApi,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { nanoid } from "nanoid";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/react-flow";
import {
  FreehandNode,
  type FreehandNodeType,
  FreehandOverlay,
  SaveStatus,
  useDrawingUndoRedo,
  useForceLayout,
} from "@/lib/canvas";
import { cn, markdownToHtml } from "@/lib/utils";
import { api } from "@/trpc/react";

import { useAutoSave } from "../hooks/use-auto-save";
import { useRoleSuggestions } from "../hooks/use-role-suggestions";
import {
  type TeamEdge as TeamEdgeType,
  type TeamNode,
  type TeamStore,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";
import { RoleDialog } from "./role-dialog";
import { type RoleNodeData, RoleNodeMemo } from "./role-node";
import { TeamCanvasControls } from "./team-canvas-controls";
import { TeamEdge } from "./team-edge";
import { TextNodeMemo } from "./text-node";

const nodeTypes = {
  "role-node": RoleNodeMemo,
  "text-node": TextNodeMemo,
  freehand: FreehandNode,
};

const edgeTypes = {
  "team-edge": TeamEdge,
};

const proOptions: ProOptions = { hideAttribution: true };

const selector = (state: TeamStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  teamId: state.teamId,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  isDirty: state.isDirty,
  editingNodeId: state.editingNodeId,
  setEditingNodeId: state.setEditingNodeId,
  isDrawing: state.isDrawing,
  setIsDrawing: state.setIsDrawing,
  markDirty: state.markDirty,
  isInitialized: state.isInitialized,
  isForceLayoutEnabled: state.isForceLayoutEnabled,
});

const MIN_PROXIMITY_DISTANCE = 150;

/** Registers React Flow instance with store. Must be inside <ReactFlow>. */
function ReactFlowInstanceRegistrar() {
  const reactFlowInstance = useReactFlow<TeamNode, TeamEdgeType>();
  const setReactFlowInstance = useTeamStore(
    (state) => state.setReactFlowInstance,
  );

  useEffect(() => {
    setReactFlowInstance(reactFlowInstance);
    return () => setReactFlowInstance(null);
  }, [reactFlowInstance, setReactFlowInstance]);

  return null;
}

/**
 * Inner component that uses useDrawingUndoRedo hook.
 * Must be rendered inside <ReactFlow> to access ReactFlowProvider context.
 * Undo/redo is ONLY for freehand drawings (session-only, not persisted).
 */
function TeamCanvasInner() {
  const { nodes, isDrawing, setIsDrawing, setNodes } = useTeamStore(
    useShallow((state) => ({
      nodes: state.nodes,
      isDrawing: state.isDrawing,
      setIsDrawing: state.setIsDrawing,
      setNodes: state.setNodes,
    })),
  );

  const { undo, redo, takeSnapshot, canUndo, canRedo } =
    useDrawingUndoRedo<TeamNode>();

  const handleDrawingComplete = useCallback(
    (node: FreehandNodeType) => {
      takeSnapshot();
      setNodes([...nodes, node]);
    },
    [takeSnapshot, setNodes, nodes],
  );

  return (
    <>
      <TeamCanvasControls
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        undo={undo}
        redo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        takeSnapshot={takeSnapshot}
      />
      <ReactFlowInstanceRegistrar />
      {isDrawing && (
        <FreehandOverlay onDrawingComplete={handleDrawingComplete} />
      )}
    </>
  );
}

export function TeamCanvas() {
  const {
    nodes,
    edges,
    teamId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    isDirty,
    editingNodeId,
    setEditingNodeId,
    isDrawing,
    markDirty,
    isForceLayoutEnabled,
  } = useTeamStore(useShallow(selector));

  const storeApi = useTeamStoreApi();
  const reactFlowStore = useStoreApi();
  const { screenToFlowPosition, getInternalNode } = useReactFlow<
    TeamNode,
    TeamEdgeType
  >();
  const { isSaving, lastSaved } = useAutoSave();
  const { consumeNextRole } = useRoleSuggestions(teamId);
  const utils = api.useUtils();

  // Force layout for automatic node positioning
  const forceLayoutEvents = useForceLayout({
    enabled: isForceLayoutEnabled,
    strength: -1500,
    distance: 350,
    collisionRadius: (node) => (node.type === "role-node" ? 250 : 120),
  });

  // Proximity edge detection - find closest node when dragging
  const getClosestEdge = useCallback(
    (node: Node) => {
      const { nodeLookup } = reactFlowStore.getState();
      const internalNode = getInternalNode(node.id);

      if (!internalNode) return null;

      let closestDistance = Number.MAX_VALUE;
      let closestNodeId: string | null = null;
      let closestNodeX = 0;

      for (const [id, n] of nodeLookup) {
        if (id !== internalNode.id) {
          const dx =
            n.internals.positionAbsolute.x -
            internalNode.internals.positionAbsolute.x;
          const dy =
            n.internals.positionAbsolute.y -
            internalNode.internals.positionAbsolute.y;
          const d = Math.sqrt(dx * dx + dy * dy);

          if (d < closestDistance && d < MIN_PROXIMITY_DISTANCE) {
            closestDistance = d;
            closestNodeId = id;
            closestNodeX = n.internals.positionAbsolute.x;
          }
        }
      }

      if (!closestNodeId) return null;

      const closeNodeIsSource =
        closestNodeX < internalNode.internals.positionAbsolute.x;

      return {
        id: closeNodeIsSource
          ? `edge-${closestNodeId}-${node.id}`
          : `edge-${node.id}-${closestNodeId}`,
        source: closeNodeIsSource ? closestNodeId : node.id,
        target: closeNodeIsSource ? node.id : closestNodeId,
        type: "team-edge" as const,
        animated: true,
        markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        className: "temp",
      };
    },
    [reactFlowStore, getInternalNode],
  );

  // Combined drag handlers: force layout + proximity edge detection
  const onNodeDragStart = useCallback(
    (event: React.MouseEvent, node: Node, nodes: Node[]) => {
      forceLayoutEvents.start?.(event, node, nodes);
    },
    [forceLayoutEvents],
  );

  const onNodeDrag = useCallback(
    (event: React.MouseEvent, node: Node, nodes: Node[]) => {
      // Force layout physics
      forceLayoutEvents.drag?.(event, node, nodes);

      // Proximity edge detection (show temp edge when close to another node)
      const closeEdge = getClosestEdge(node);
      const currentEdges = storeApi.getState().edges;
      const nextEdges = currentEdges.filter((e) => e.className !== "temp");

      if (
        closeEdge &&
        !nextEdges.find(
          (ne) =>
            ne.source === closeEdge.source && ne.target === closeEdge.target,
        )
      ) {
        nextEdges.push(closeEdge);
      }

      setEdges(nextEdges);
    },
    [forceLayoutEvents, getClosestEdge, storeApi, setEdges],
  );

  const onNodeDragStop = useCallback(
    (event: React.MouseEvent, node: Node, nodes: Node[]) => {
      // Force layout physics
      forceLayoutEvents.stop?.(event, node, nodes);

      // Finalize proximity edge (convert temp edge to permanent)
      const closeEdge = getClosestEdge(node);
      const currentEdges = storeApi.getState().edges;
      const nextEdges = currentEdges.filter((e) => e.className !== "temp");

      if (
        closeEdge &&
        !nextEdges.find(
          (ne) =>
            ne.source === closeEdge.source && ne.target === closeEdge.target,
        )
      ) {
        const { className: _, ...edgeWithoutTemp } = closeEdge;
        nextEdges.push(edgeWithoutTemp);
        markDirty();
      }

      setEdges(nextEdges);
    },
    [forceLayoutEvents, getClosestEdge, storeApi, setEdges, markDirty],
  );

  // Edge drop: create new role when connection drops on empty space
  const pendingDropContextRef = useRef<{
    position: { x: number; y: number };
    sourceNodeId: string;
  } | null>(null);

  const createRole = api.role.create.useMutation({
    onMutate: async (variables) => {
      await utils.role.getByTeam.cancel({ teamId });

      const previousRoles = utils.role.getByTeam.getData({ teamId });
      const { nodes: currentNodes, edges: currentEdges } = storeApi.getState();
      const previousNodes = [...currentNodes];
      const previousEdges = [...currentEdges];

      const tempRoleId = `temp-role-${nanoid(8)}`;
      const nodeId = variables.nodeId;

      const optimisticRole = {
        id: tempRoleId,
        title: variables.title,
        purpose: variables.purpose,
        accountabilities: variables.accountabilities ?? null,
        teamId: variables.teamId,
        metricId: null,
        nodeId: variables.nodeId,
        assignedUserId: null,
        effortPoints: null,
        color: variables.color ?? "#3b82f6",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: null,
        isPending: true,
      };

      const dropContext = pendingDropContextRef.current;
      const position = dropContext?.position ?? { x: 0, y: 0 };
      const sourceNodeId = dropContext?.sourceNodeId;

      const optimisticNode = {
        id: nodeId,
        type: "role-node" as const,
        position,
        data: {
          roleId: tempRoleId,
          title: variables.title,
          purpose: variables.purpose,
          accountabilities: variables.accountabilities ?? undefined,
          color: variables.color ?? "#3b82f6",
          isPending: true,
        } as RoleNodeData,
      };

      setNodes([...currentNodes, optimisticNode]);

      if (sourceNodeId) {
        const newEdge = {
          id: `edge-${sourceNodeId}-${nodeId}`,
          source: sourceNodeId,
          target: nodeId,
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        };
        setEdges([...currentEdges, newEdge]);
      }

      markDirty();
      pendingDropContextRef.current = null;

      utils.role.getByTeam.setData({ teamId }, (old) => {
        const roleWithPending = optimisticRole as typeof old extends
          | (infer T)[]
          | undefined
          ? T
          : never;
        if (!old) return [roleWithPending];
        return [...old, roleWithPending];
      });

      return {
        previousRoles,
        previousNodes,
        previousEdges,
        tempRoleId,
        nodeId,
      };
    },
    onSuccess: (newRole, _variables, context) => {
      if (!context) return;

      const currentNodes = storeApi.getState().nodes;
      const updatedNodes = currentNodes.map((node) => {
        if (node.id === context.nodeId && node.type === "role-node") {
          return {
            ...node,
            data: {
              ...node.data,
              roleId: newRole.id,
              isPending: undefined,
            },
          };
        }
        return node;
      });
      setNodes(updatedNodes);

      utils.role.getByTeam.setData({ teamId }, (old) => {
        if (!old) return [newRole];
        return old.map((role) =>
          role.id === context.tempRoleId ? newRole : role,
        );
      });
    },
    onError: (error, _variables, context) => {
      if (context?.previousRoles) {
        utils.role.getByTeam.setData({ teamId }, context.previousRoles);
      }
      if (context?.previousNodes) {
        setNodes(context.previousNodes);
      }
      if (context?.previousEdges) {
        setEdges(context.previousEdges);
      }
      toast.error("Failed to create role", {
        description: error.message ?? "An unexpected error occurred",
      });
    },
  });

  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, connectionState: FinalConnectionState) => {
      if (connectionState.isValid) return;

      const sourceNodeId = connectionState.fromNode?.id;
      if (!sourceNodeId) return;

      const { clientX, clientY } =
        "changedTouches" in event ? event.changedTouches[0]! : event;

      const position = screenToFlowPosition({
        x: clientX,
        y: clientY,
      });

      pendingDropContextRef.current = { position, sourceNodeId };

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
    },
    [teamId, screenToFlowPosition, consumeNextRole, createRole],
  );

  // Get selected role data from editingNodeId
  const selectedRole = useMemo(() => {
    if (!editingNodeId) return null;
    const node = nodes.find((n) => n.id === editingNodeId);
    if (!node || node.type !== "role-node") return null;
    return {
      ...node.data,
      nodeId: node.id,
    };
  }, [editingNodeId, nodes]);

  // Clear editing state when dialog closes
  useEffect(() => {
    if (!selectedRole && editingNodeId) {
      setEditingNodeId(null);
    }
  }, [selectedRole, editingNodeId, setEditingNodeId]);

  return (
    <div className="relative h-full w-full">
      {/* Save Status Indicator */}
      <div className="absolute top-4 right-4 z-20">
        <SaveStatus
          isSaving={isSaving}
          isDirty={isDirty}
          lastSaved={lastSaved}
        />
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectEnd={onConnectEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDrag={onNodeDrag}
        onNodeDragStop={onNodeDragStop}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        proOptions={proOptions}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{
          maxZoom: 0.65,
          minZoom: 0.65,
        }}
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
        panOnScroll={!isDrawing}
        panOnDrag={isDrawing ? false : [1, 2]}
        zoomOnScroll={!isDrawing}
        selectNodesOnDrag={false}
        selectionOnDrag={!isDrawing}
        selectionMode={SelectionMode.Partial}
        defaultEdgeOptions={{
          type: "team-edge",
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, width: 20, height: 20 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
        <TeamCanvasInner />
      </ReactFlow>

      {/* Edit Role Dialog */}
      {selectedRole && (
        <RoleDialog
          teamId={teamId}
          roleData={selectedRole}
          open={!!editingNodeId}
          onOpenChange={(open) => {
            if (!open) setEditingNodeId(null);
          }}
        />
      )}
    </div>
  );
}
