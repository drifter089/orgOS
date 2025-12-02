"use client";

import { useEffect } from "react";

import {
  type FreehandNodeData,
  type FreehandNodeType,
  type TextNodeFontSize,
} from "@/lib/canvas";
import type { RouterOutputs } from "@/trpc/react";

import {
  type SystemsNode,
  type TextNode,
  useSystemsStore,
} from "../store/systems-store";
import type {
  StoredEdge,
  SystemsStoredNode,
} from "../utils/canvas-serialization";
import { type MetricCardNode } from "./metric-card-node";
import { SystemsCanvas } from "./systems-canvas";

type DashboardMetrics =
  RouterOutputs["dashboard"]["getAllDashboardMetricsWithCharts"];

const CARD_WIDTH = 540;
const CARD_HEIGHT = 450;
const COLUMNS = 3;

function buildInitialNodes(
  dashboardMetrics: DashboardMetrics,
  savedNodes: SystemsStoredNode[],
): SystemsNode[] {
  // Build metric card nodes
  const savedPositions = new Map<string, { x: number; y: number }>();
  savedNodes.forEach((n) => {
    if (!n.type || n.type === "metricCard") {
      savedPositions.set(n.id, n.position);
    }
  });

  const metricCardNodes: MetricCardNode[] = dashboardMetrics.map(
    (dm, index): MetricCardNode => {
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
    },
  );

  // Build freehand nodes from saved data
  const freehandNodes: FreehandNodeType[] = savedNodes
    .filter((n) => n.type === "freehand")
    .map((n) => {
      const freehandData = n.data as FreehandNodeData | undefined;
      return {
        id: n.id,
        type: "freehand" as const,
        position: n.position,
        data: {
          points: freehandData?.points ?? [],
          initialSize: freehandData?.initialSize ?? { width: 100, height: 100 },
        },
        width: n.style?.width,
        height: n.style?.height,
      };
    });

  // Build text nodes from saved data
  const textNodes: TextNode[] = savedNodes
    .filter((n) => n.type === "text-node")
    .map((n) => {
      const textData = n.data as
        | { text?: string; fontSize?: TextNodeFontSize }
        | undefined;
      return {
        id: n.id,
        type: "text-node" as const,
        position: n.position,
        data: {
          text: textData?.text ?? "",
          fontSize: textData?.fontSize ?? "medium",
        },
        style: n.style,
      };
    });

  return [...metricCardNodes, ...freehandNodes, ...textNodes];
}

export function SystemsCanvasWrapper({
  dashboardMetrics,
  savedNodes,
  savedEdges,
}: {
  dashboardMetrics: DashboardMetrics;
  savedNodes: SystemsStoredNode[];
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
