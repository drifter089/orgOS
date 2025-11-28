"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Background,
  BackgroundVariant,
  type ProOptions,
  ReactFlow,
  useEdgesState,
  useNodesState,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { ZoomSlider } from "@/components/zoom-slider";
import { api } from "@/trpc/react";

import {
  MetricCardNode,
  type MetricCardNode as MetricCardNodeType,
} from "./metric-card-node";

const nodeTypes = {
  metricCard: MetricCardNode,
};

const proOptions: ProOptions = { hideAttribution: true };

const CARD_WIDTH = 480;
const CARD_HEIGHT = 420;
const COLUMNS = 3;

export function SystemsCanvas() {
  const [mounted, setMounted] = useState(false);

  const { data: dashboardMetrics } =
    api.dashboard.getAllDashboardMetricsWithCharts.useQuery();

  const initialNodes = useMemo(() => {
    if (!dashboardMetrics) return [];

    return dashboardMetrics.map((dm, index): MetricCardNodeType => {
      const col = index % COLUMNS;
      const row = Math.floor(index / COLUMNS);

      return {
        id: dm.id,
        type: "metricCard",
        position: { x: col * CARD_WIDTH, y: row * CARD_HEIGHT },
        data: { dashboardMetric: dm },
      };
    });
  }, [dashboardMetrics]);

  const [nodes, setNodes, onNodesChange] = useNodesState<MetricCardNodeType>(
    [],
  );
  const [edges, , onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (initialNodes.length > 0) {
      setNodes(initialNodes);
    }
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!dashboardMetrics) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center">
        <p className="text-muted-foreground">Loading metrics...</p>
      </div>
    );
  }

  if (dashboardMetrics.length === 0) {
    return (
      <div className="fixed inset-0 top-16 flex items-center justify-center">
        <p className="text-muted-foreground">
          No metrics with chart data found. Add metrics from the dashboard
          first.
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 top-16">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        proOptions={proOptions}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={1.5}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <ZoomSlider position="bottom-left" />
      </ReactFlow>
    </div>
  );
}
