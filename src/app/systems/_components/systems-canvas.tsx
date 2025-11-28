"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  type ProOptions,
  ReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Loader2, Save } from "lucide-react";
import { useShallow } from "zustand/react/shallow";

import { ZoomSlider } from "@/components/zoom-slider";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";

import {
  loadSystemsCanvasState,
  useSystemsAutoSave,
} from "../hooks/use-systems-auto-save";
import { type SystemsStore, useSystemsStore } from "../store/systems-store";
import {
  MetricCardNode,
  type MetricCardNode as MetricCardNodeType,
} from "./metric-card-node";

const nodeTypes = {
  metricCard: MetricCardNode,
};

const proOptions: ProOptions = { hideAttribution: true };

const CARD_WIDTH = 540;
const CARD_HEIGHT = 450;
const COLUMNS = 3;

const selector = (state: SystemsStore) => ({
  nodes: state.nodes,
  edges: state.edges,
  onNodesChange: state.onNodesChange,
  onEdgesChange: state.onEdgesChange,
  onConnect: state.onConnect,
  setNodes: state.setNodes,
  setEdges: state.setEdges,
  setInitialized: state.setInitialized,
  isDirty: state.isDirty,
});

export function SystemsCanvas() {
  const [mounted, setMounted] = useState(false);

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    setNodes,
    setEdges,
    setInitialized,
    isDirty,
  } = useSystemsStore(useShallow(selector));

  const { isSaving, lastSaved } = useSystemsAutoSave();

  const { data: dashboardMetrics } =
    api.dashboard.getAllDashboardMetricsWithCharts.useQuery();

  const initialNodes = useMemo(() => {
    if (!dashboardMetrics) return [];

    const savedState = loadSystemsCanvasState();
    const savedPositions = new Map(
      savedState?.nodes.map((n) => [n.id, n.position]) ?? [],
    );

    return dashboardMetrics.map((dm, index): MetricCardNodeType => {
      const savedPosition = savedPositions.get(dm.id);
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);

      return {
        id: dm.id,
        type: "metricCard",
        position: savedPosition ?? {
          x: col * CARD_WIDTH,
          y: row * CARD_HEIGHT,
        },
        data: { dashboardMetric: dm },
      };
    });
  }, [dashboardMetrics]);

  const initialEdges = useMemo(() => {
    const savedState = loadSystemsCanvasState();
    return savedState?.edges ?? [];
  }, []);

  useEffect(() => {
    if (initialNodes.length > 0 && nodes.length === 0) {
      setNodes(initialNodes);
      setEdges(initialEdges);
      const timer = setTimeout(() => {
        setInitialized(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [
    initialNodes,
    initialEdges,
    nodes.length,
    setNodes,
    setEdges,
    setInitialized,
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!dashboardMetrics) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  if (dashboardMetrics.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">
          No metrics with chart data found. Add metrics from the dashboard
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-4 right-4 z-20">
        <div className="supports-backdrop-filter:bg-background/60 bg-background/95 ring-border/50 rounded-md border px-3 py-2 shadow-md ring-1 backdrop-blur-sm">
          {isSaving ? (
            <div className="flex items-center gap-2 text-sm">
              <Loader2 className="text-primary h-3.5 w-3.5 animate-spin" />
              <span className="font-medium">Saving...</span>
            </div>
          ) : isDirty ? (
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              <span className="text-muted-foreground font-medium">
                Unsaved changes
              </span>
            </div>
          ) : lastSaved ? (
            <div className="flex items-center gap-2 text-sm">
              <Save className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-muted-foreground font-medium">Saved</span>
            </div>
          ) : null}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        connectionLineType={ConnectionLineType.SmoothStep}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
        }}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        className={cn(
          "bg-background",
          "transition-opacity duration-200",
          isSaving && "opacity-90",
        )}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
