"use client";

import { useCallback, useMemo } from "react";

import { useReactFlow } from "@xyflow/react";
import { nanoid } from "nanoid";
import { toast } from "sonner";

import type { RouterOutputs } from "@/trpc/react";

import { type ChartNodeData } from "../_components/chart-node";
import {
  type TeamEdge,
  type TeamNode,
  useTeamStore,
  useTeamStoreApi,
} from "../store/team-store";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];
type DashboardMetricWithRelations = DashboardMetrics[number];

export interface ChartDragData {
  type: "chart-node";
  dashboardMetricId: string;
  dashboardMetric: DashboardMetricWithRelations;
}

const CHART_NODE_WIDTH = 750;
const CHART_NODE_HEIGHT = 420;

export function useChartDragDrop() {
  const { screenToFlowPosition } = useReactFlow<TeamNode, TeamEdge>();
  const storeApi = useTeamStoreApi();
  const setNodes = useTeamStore((state) => state.setNodes);
  const markDirty = useTeamStore((state) => state.markDirty);
  const nodes = useTeamStore((state) => state.nodes);

  const chartNodesOnCanvas = useMemo(() => {
    return new Set(
      nodes
        .filter(
          (node): node is TeamNode & { type: "chart-node" } =>
            node.type === "chart-node",
        )
        .map((node) => node.data.dashboardMetricId),
    );
  }, [nodes]);

  const isMetricOnCanvas = useCallback(
    (dashboardMetricId: string) => chartNodesOnCanvas.has(dashboardMetricId),
    [chartNodesOnCanvas],
  );

  const addChartNode = useCallback(
    (
      dashboardMetric: DashboardMetricWithRelations,
      position: { x: number; y: number },
    ) => {
      const nodeId = `chart-${nanoid(8)}`;
      const newNode: TeamNode = {
        id: nodeId,
        type: "chart-node",
        position: {
          // Center the node on the drop position
          x: position.x - CHART_NODE_WIDTH / 2,
          y: position.y - CHART_NODE_HEIGHT / 2,
        },
        data: {
          dashboardMetricId: dashboardMetric.id,
          dashboardMetric,
        } as ChartNodeData,
      };

      const currentNodes = storeApi.getState().nodes;
      setNodes([...currentNodes, newNode]);
      markDirty();
      return nodeId;
    },
    [storeApi, setNodes, markDirty],
  );

  const removeChartNode = useCallback(
    (dashboardMetricId: string) => {
      const currentNodes = storeApi.getState().nodes;
      const nodeToRemove = currentNodes.find(
        (node) =>
          node.type === "chart-node" &&
          node.data.dashboardMetricId === dashboardMetricId,
      );

      if (nodeToRemove) {
        const currentEdges = storeApi.getState().edges;
        setNodes(currentNodes.filter((n) => n.id !== nodeToRemove.id));
        const setEdges = storeApi.getState().setEdges;
        setEdges(
          currentEdges.filter(
            (e) => e.source !== nodeToRemove.id && e.target !== nodeToRemove.id,
          ),
        );
        markDirty();
      }
    },
    [storeApi, setNodes, markDirty],
  );

  const toggleChartNodeVisibility = useCallback(
    (dashboardMetric: DashboardMetricWithRelations) => {
      if (isMetricOnCanvas(dashboardMetric.id)) {
        removeChartNode(dashboardMetric.id);
        toast.info(`"${dashboardMetric.metric.name}" removed from canvas`);
      } else {
        const viewportCenter = screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        addChartNode(dashboardMetric, viewportCenter);
        toast.success(`"${dashboardMetric.metric.name}" added to canvas`);
      }
    },
    [isMetricOnCanvas, removeChartNode, addChartNode, screenToFlowPosition],
  );

  const onDrop: React.DragEventHandler = useCallback(
    (event) => {
      event.preventDefault();

      const dataString = event.dataTransfer.getData("application/reactflow");
      if (!dataString) return;

      try {
        const dragData = JSON.parse(dataString) as ChartDragData;

        if (dragData.type !== "chart-node") return;

        if (isMetricOnCanvas(dragData.dashboardMetricId)) {
          toast.warning("This metric is already on the canvas");
          return;
        }

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });

        addChartNode(dragData.dashboardMetric, position);
        toast.success(
          `"${dragData.dashboardMetric.metric.name}" added to canvas`,
        );
      } catch (error) {
        console.error("Failed to parse drag data:", error);
      }
    },
    [isMetricOnCanvas, screenToFlowPosition, addChartNode],
  );

  const onDragOver: React.DragEventHandler = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  return useMemo(
    () => ({
      onDrop,
      onDragOver,
      isMetricOnCanvas,
      addChartNode,
      removeChartNode,
      toggleChartNodeVisibility,
      chartNodesOnCanvas,
    }),
    [
      onDrop,
      onDragOver,
      isMetricOnCanvas,
      addChartNode,
      removeChartNode,
      toggleChartNodeVisibility,
      chartNodesOnCanvas,
    ],
  );
}
