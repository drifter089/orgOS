"use client";

import { useCallback, useEffect, useState } from "react";

import { Plus, X } from "lucide-react";

import { PlatformsDialog } from "@/app/integration/_components";
import {
  type DashboardChart,
  MetricTabsDisplay,
} from "@/app/metric/_components";
import type { ChartDragData } from "@/app/teams/[teamId]/hooks/use-chart-drag-drop";
import { KpiCard } from "@/components/metric/kpi-card";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardSheetEdgeTrigger } from "./dashboard-sheet-edge-trigger";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

// =============================================================================
// Dashboard Sidebar
// =============================================================================

interface DashboardSidebarProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
  onMetricCreated?: () => void;
  side?: "left" | "right";
  // Drag-drop props (optional, for team canvas integration)
  enableDragDrop?: boolean;
  chartNodesOnCanvas?: Set<string>;
  onToggleChartVisibility?: (dashboardChart: DashboardChart) => void;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

export function DashboardSidebar({
  teamId,
  initialIntegrations,
  onMetricCreated,
  side = "right",
  enableDragDrop = false,
  chartNodesOnCanvas,
  onToggleChartVisibility,
  externalOpen,
  onExternalOpenChange,
}: DashboardSidebarProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);

  const isControlled = externalOpen !== undefined;
  const isOpen = isControlled ? externalOpen : internalOpen;
  const setIsOpen = isControlled ? onExternalOpenChange! : setInternalOpen;

  // Handle drag start
  const handleDragStart = useCallback(
    (e: React.DragEvent, dashboardChart: DashboardChart) => {
      const dragData: ChartDragData = {
        type: "chart-node",
        dashboardMetricId: dashboardChart.id,
        dashboardMetric: dashboardChart,
      };
      e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
      e.dataTransfer.effectAllowed = "copy";

      // Set a custom drag image to ensure visibility
      const dragElement = e.currentTarget as HTMLElement;
      e.dataTransfer.setDragImage(dragElement, 50, 25);

      setIsDragging(dashboardChart.metric.id);
    },
    [],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
    } else {
      const scrollY = document.body.style.top;
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
      window.scrollTo(0, parseInt(scrollY || "0") * -1);
    }

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.width = "";
    };
  }, [isOpen]);

  return (
    <>
      {!isControlled && (
        <>
          <div
            className={cn(
              "fixed inset-0 z-[51] bg-black/20 transition-opacity duration-300",
              isOpen ? "opacity-100" : "pointer-events-none opacity-0",
              // Allow pointer events to pass through during drag
              isDragging && "pointer-events-none",
            )}
            onClick={() => setIsOpen(false)}
          />

          <DashboardSheetEdgeTrigger
            isOpen={isOpen}
            onToggle={() => setIsOpen(!isOpen)}
            side={side}
          />
        </>
      )}

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent
          side={side}
          className="z-[60] w-[26rem] overflow-hidden p-0 sm:max-w-none"
          hideCloseButton
        >
          <SheetTitle className="sr-only">Dashboard Sidebar</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Manage KPIs
                  </h2>
                  <p className="text-muted-foreground text-xs">
                    Connect platforms and track metrics
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PlatformsDialog
                    teamId={teamId}
                    initialIntegrations={initialIntegrations}
                    onMetricCreated={onMetricCreated}
                    trigger={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 border px-3"
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        KPI
                      </Button>
                    }
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 border p-0"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-4 overflow-y-auto px-4 py-3 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              <div className="space-y-3">
                <h3 className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  Your Metrics
                </h3>
                <MetricTabsDisplay
                  teamId={teamId}
                  className="w-full"
                  renderMetricCard={(dashboardChart) => (
                    <KpiCard
                      key={dashboardChart.id}
                      dashboardChart={dashboardChart}
                      teamId={teamId}
                      enableDragDrop={enableDragDrop}
                      isOnCanvas={chartNodesOnCanvas?.has(dashboardChart.id)}
                      isDragging={isDragging === dashboardChart.metric.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onToggleVisibility={onToggleChartVisibility}
                    />
                  )}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
