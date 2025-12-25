"use client";

import { useCallback, useEffect, useState } from "react";

import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Loader2,
  PenLine,
  Plus,
  Settings,
} from "lucide-react";

import {
  AddPlatformButton,
  IntegrationGrid,
} from "@/app/integration/_components";
import {
  type DashboardChart,
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  LinearMetricDialog,
  ManualMetricDialog,
  MetricTabsDisplay,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
import type { ChartDragData } from "@/app/teams/[teamId]/hooks/use-chart-drag-drop";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardSheetEdgeTrigger } from "./dashboard-sheet-edge-trigger";
import { MetricSettingsDrawer } from "./metric-settings-drawer";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

// =============================================================================
// Sidebar Metric Card with Settings Drawer
// =============================================================================

interface SidebarMetricCardProps {
  dashboardChart: DashboardChart;
  teamId: string;
  enableDragDrop: boolean;
  chartNodesOnCanvas?: Set<string>;
  onToggleChartVisibility?: (dashboardChart: DashboardChart) => void;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent, dashboardChart: DashboardChart) => void;
  onDragEnd: () => void;
}

function SidebarMetricCard({
  dashboardChart,
  teamId,
  enableDragDrop,
  chartNodesOnCanvas,
  onToggleChartVisibility,
  isDragging,
  onDragStart,
  onDragEnd,
}: SidebarMetricCardProps) {
  const metric = dashboardChart.metric;
  const isProcessing = !!metric.refreshStatus;
  const isOnCanvas = chartNodesOnCanvas?.has(dashboardChart.id);
  const canDrag = enableDragDrop && !isProcessing;
  const isCurrentlyDragging = isDragging;

  return (
    <div
      draggable={canDrag ? true : undefined}
      onDragStart={(e) => {
        e.stopPropagation();
        if (canDrag) {
          onDragStart(e, dashboardChart);
        }
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "group hover:bg-accent/50 relative flex items-center gap-3 rounded-lg border p-3",
        isProcessing && "opacity-70",
        canDrag && "cursor-grab active:cursor-grabbing",
        isCurrentlyDragging && "border-primary opacity-50",
        isOnCanvas && "border-primary/50 bg-primary/5",
      )}
    >
      {/* Drag handle indicator */}
      {enableDragDrop &&
        (canDrag ? (
          <GripVertical className="text-muted-foreground/50 group-hover:text-muted-foreground h-4 w-4 shrink-0 transition-colors" />
        ) : (
          <div className="h-4 w-4 shrink-0" />
        ))}

      <div
        className={cn(
          "h-8 w-1 rounded-full",
          getPlatformConfig(metric.integration?.providerId ?? "manual").bgColor,
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium">{metric.name}</p>
          {isProcessing && (
            <Badge variant="secondary" className="shrink-0 text-xs">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              Processing
            </Badge>
          )}
          {isOnCanvas && (
            <Badge
              variant="outline"
              className="border-primary/30 text-primary shrink-0 text-xs"
            >
              <Check className="mr-1 h-3 w-3" />
              On canvas
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-xs capitalize">
          {metric.integration?.providerId ?? "manual"}
        </p>
      </div>

      {/* Settings button - opens unified drawer */}
      <MetricSettingsDrawer
        dashboardChart={dashboardChart}
        teamId={teamId}
        trigger={
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e) => e.stopPropagation()}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Settings</TooltipContent>
          </Tooltip>
        }
      />

      {/* Eye toggle button - only when drag-drop is enabled */}
      {enableDragDrop && onToggleChartVisibility && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                onToggleChartVisibility(dashboardChart);
              }}
            >
              {isOnCanvas ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isOnCanvas ? "Remove from canvas" : "Add to canvas"}
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

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
}

export function DashboardSidebar({
  teamId,
  initialIntegrations,
  onMetricCreated,
  side = "right",
  enableDragDrop = false,
  chartNodesOnCanvas,
  onToggleChartVisibility,
}: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState<string | null>(null);

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

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent
          side={side}
          className="z-[52] w-[40rem] overflow-hidden p-0 sm:max-w-none"
        >
          <SheetTitle className="sr-only">Dashboard Sidebar</SheetTitle>
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b px-6 py-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  Manage KPIs
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Connect platforms and create KPIs for your dashboard
                </p>
              </div>
            </div>

            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-6 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {/* Add Platform + Integration Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Platforms</h3>
                  <AddPlatformButton onConnectionSuccess={onMetricCreated} />
                </div>

                <IntegrationGrid
                  initialData={initialIntegrations}
                  gridCols={3}
                  size="sm"
                  showMetricDialogs={true}
                  onMetricCreated={onMetricCreated}
                  teamId={teamId}
                  MetricDialogs={{
                    github: GitHubMetricDialog,
                    posthog: PostHogMetricDialog,
                    youtube: YouTubeMetricDialog,
                    "google-sheet": GoogleSheetsMetricDialog,
                    linear: LinearMetricDialog,
                  }}
                  extraCards={
                    <div className="flex flex-col gap-2">
                      <div className="group relative aspect-square">
                        <div
                          className={cn(
                            "flex h-full w-full flex-col items-center justify-center rounded-lg border",
                            "bg-stone-200 dark:bg-stone-700",
                          )}
                        >
                          <PenLine className="h-10 w-10 text-stone-700 dark:text-stone-200" />
                          <p className="mt-2 text-xs font-medium text-stone-700 dark:text-stone-200">
                            Manual
                          </p>
                        </div>
                      </div>
                      <ManualMetricDialog
                        teamId={teamId}
                        onSuccess={onMetricCreated}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="hover:bg-accent w-full shadow-sm transition-all hover:shadow-md"
                          >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Add KPI
                          </Button>
                        }
                      />
                    </div>
                  }
                />
              </div>

              <Separator />

              {/* Metrics Tabs */}
              <div className="space-y-4">
                <h3 className="font-semibold">Your Metrics</h3>
                <MetricTabsDisplay
                  teamId={teamId}
                  className="w-full"
                  renderMetricCard={(dashboardChart) => (
                    <SidebarMetricCard
                      key={dashboardChart.id}
                      dashboardChart={dashboardChart}
                      teamId={teamId}
                      enableDragDrop={enableDragDrop}
                      chartNodesOnCanvas={chartNodesOnCanvas}
                      onToggleChartVisibility={onToggleChartVisibility}
                      isDragging={isDragging === dashboardChart.metric.id}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
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
