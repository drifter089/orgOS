"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  Background,
  BackgroundVariant,
  type Connection,
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

import { useChartDragContext } from "../context/chart-drag-context";
import { useAutoSave } from "../hooks/use-auto-save";
import { useChartDragDrop } from "../hooks/use-chart-drag-drop";
import { useCreateRole } from "../hooks/use-create-role";
import { useRoleSuggestions } from "../hooks/use-role-suggestions";
import {
  type TeamEdge as TeamEdgeType,
  type TeamNode,
  type TeamStore,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";
import { ChartNodeMemo } from "./chart-node";
import { RoleDialog } from "./role-dialog";
import { RoleNodeMemo } from "./role-node";
import { TeamCanvasControls } from "./team-canvas-controls";
import { TeamEdge } from "./team-edge";
import { TextNodeMemo } from "./text-node";

const nodeTypes = {
  "role-node": RoleNodeMemo,
  "text-node": TextNodeMemo,
  "chart-node": ChartNodeMemo,
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
  const {
    onDrop: onChartDrop,
    onDragOver: onChartDragOver,
    chartNodesOnCanvas,
    toggleChartNodeVisibility,
  } = useChartDragDrop();
  const { setChartNodesOnCanvas, registerToggleCallback } =
    useChartDragContext();

  useEffect(() => {
    setChartNodesOnCanvas(chartNodesOnCanvas);
  }, [chartNodesOnCanvas, setChartNodesOnCanvas]);

  useEffect(() => {
    registerToggleCallback(toggleChartNodeVisibility);
  }, [registerToggleCallback, toggleChartNodeVisibility]);

  // Force layout for automatic node positioning
  const forceLayoutEvents = useForceLayout({
    enabled: isForceLayoutEnabled,
    strength: -1500,
    distance: 350,
    collisionRadius: (node) => {
      if (node.type === "chart-node") return 350; // Larger collision radius for chart nodes
      if (node.type === "role-node") return 250;
      return 120;
    },
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
        const { className: _tempClass, ...edgeWithoutTemp } = closeEdge;
        void _tempClass;
        nextEdges.push(edgeWithoutTemp);
        markDirty();
      }

      setEdges(nextEdges);
    },
    [forceLayoutEvents, getClosestEdge, storeApi, setEdges, markDirty],
  );

  const pendingDropContextRef = useRef<{
    position: { x: number; y: number };
    sourceNodeId: string;
  } | null>(null);

  const getNodeOptions = useCallback(() => {
    const dropContext = pendingDropContextRef.current;
    const position = dropContext?.position ?? { x: 0, y: 0 };
    return { position };
  }, []);

  const getEdgeOptions = useCallback((_nodeId: string) => {
    const dropContext = pendingDropContextRef.current;
    pendingDropContextRef.current = null;
    return { sourceNodeId: dropContext?.sourceNodeId };
  }, []);

  const createRole = useCreateRole({
    teamId,
    getNodeOptions,
    getEdgeOptions,
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

  const isValidConnection = useCallback(
    (connection: Connection | TeamEdgeType) => {
      const sourceNode = nodes.find((n) => n.id === connection.source);
      const targetNode = nodes.find((n) => n.id === connection.target);

      if (
        sourceNode?.type === "role-node" &&
        targetNode?.type === "chart-node"
      ) {
        const existingChartConnection = edges.find(
          (e) =>
            e.source === connection.source &&
            nodes.find((n) => n.id === e.target)?.type === "chart-node",
        );
        if (existingChartConnection) {
          toast.warning("This role is already connected to a chart");
          return false;
        }
      }

      if (
        sourceNode?.type === "chart-node" &&
        targetNode?.type === "role-node"
      ) {
        const existingChartConnection = edges.find(
          (e) =>
            e.target === connection.target &&
            nodes.find((n) => n.id === e.source)?.type === "chart-node",
        );
        if (existingChartConnection) {
          toast.warning("This role is already connected to a chart");
          return false;
        }
      }

      return true;
    },
    [nodes, edges],
  );

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
        onDrop={onChartDrop}
        onDragOver={onChartDragOver}
        isValidConnection={isValidConnection}
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
