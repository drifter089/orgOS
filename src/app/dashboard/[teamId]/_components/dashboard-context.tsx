"use client";

import { type ReactNode, createContext, useContext } from "react";

import type { UseDashboardChartsReturn } from "./use-dashboard-charts";

const DashboardContext = createContext<UseDashboardChartsReturn | null>(null);

export function DashboardProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: UseDashboardChartsReturn;
}) {
  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useDashboard must be used within DashboardProvider");
  }
  return context;
}

/**
 * Optional version of useDashboard that returns null when outside DashboardProvider.
 * Use this for components that can work both inside and outside the dashboard context.
 */
export function useDashboardOptional() {
  return useContext(DashboardContext);
}
