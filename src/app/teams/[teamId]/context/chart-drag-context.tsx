"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useState,
} from "react";

import type { RouterOutputs } from "@/trpc/react";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardCharts"];
type DashboardMetricWithRelations = DashboardMetrics[number];

interface ChartDragContextValue {
  /** Set of dashboard chart IDs currently on canvas */
  chartNodesOnCanvas: Set<string>;
  /** Update the set of chart nodes on canvas */
  setChartNodesOnCanvas: (ids: Set<string>) => void;
  /** Callback to toggle chart visibility */
  onToggleChartVisibility: ((dm: DashboardMetricWithRelations) => void) | null;
  /** Register the toggle callback from the canvas */
  registerToggleCallback: (
    callback: (dm: DashboardMetricWithRelations) => void,
  ) => void;
}

const ChartDragContext = createContext<ChartDragContextValue | null>(null);

export function ChartDragProvider({ children }: { children: ReactNode }) {
  const [chartNodesOnCanvas, setChartNodesOnCanvas] = useState<Set<string>>(
    new Set(),
  );
  const [toggleCallback, setToggleCallback] = useState<
    ((dm: DashboardMetricWithRelations) => void) | null
  >(null);

  const registerToggleCallback = useCallback(
    (callback: (dm: DashboardMetricWithRelations) => void) => {
      setToggleCallback(() => callback);
    },
    [],
  );

  return (
    <ChartDragContext.Provider
      value={{
        chartNodesOnCanvas,
        setChartNodesOnCanvas,
        onToggleChartVisibility: toggleCallback,
        registerToggleCallback,
      }}
    >
      {children}
    </ChartDragContext.Provider>
  );
}

export function useChartDragContext() {
  const context = useContext(ChartDragContext);
  if (!context) {
    // Return a no-op context for components outside the provider
    const noop = () => {
      /* no-op for components outside provider */
    };
    return {
      chartNodesOnCanvas: new Set<string>(),
      setChartNodesOnCanvas: noop,
      onToggleChartVisibility: null,
      registerToggleCallback: noop,
    };
  }
  return context;
}
