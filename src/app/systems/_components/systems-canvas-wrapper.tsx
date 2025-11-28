"use client";

import { useEffect } from "react";

import type { RouterOutputs } from "@/trpc/react";

import { useSystemsStore } from "../store/systems-store";
import type { StoredEdge, StoredNode } from "../utils/canvas-serialization";
import { type MetricCardNode } from "./metric-card-node";
import { SystemsCanvas } from "./systems-canvas";

type DashboardMetrics =
  RouterOutputs["dashboard"]["getAllDashboardMetricsWithCharts"];

const CARD_WIDTH = 540;
const CARD_HEIGHT = 450;
const COLUMNS = 3;

function buildInitialNodes(
  dashboardMetrics: DashboardMetrics,
  savedNodes: StoredNode[],
): MetricCardNode[] {
  const savedPositions = new Map<string, { x: number; y: number }>();
  savedNodes.forEach((n) => {
    savedPositions.set(n.id, n.position);
  });

  return dashboardMetrics.map((dm, index): MetricCardNode => {
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
}

export function SystemsCanvasWrapper({
  dashboardMetrics,
  savedNodes,
  savedEdges,
}: {
  dashboardMetrics: DashboardMetrics;
  savedNodes: StoredNode[];
  savedEdges: StoredEdge[];
}) {
  const setNodes = useSystemsStore((state) => state.setNodes);
  const setEdges = useSystemsStore((state) => state.setEdges);
  const setInitialized = useSystemsStore((state) => state.setInitialized);

  useEffect(() => {
    const initialNodes = buildInitialNodes(dashboardMetrics, savedNodes);
    setNodes(initialNodes);
    setEdges(savedEdges as unknown as Parameters<typeof setEdges>[0]);

    // Delay initialization to let React Flow complete setup without triggering dirty state
    const timer = setTimeout(() => {
      setInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [
    dashboardMetrics,
    savedNodes,
    savedEdges,
    setNodes,
    setEdges,
    setInitialized,
  ]);

  return <SystemsCanvas />;
}
