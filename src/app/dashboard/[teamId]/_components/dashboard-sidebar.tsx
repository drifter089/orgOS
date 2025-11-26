"use client";

import { useEffect, useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";

import {
  AddPlatformButton,
  IntegrationGrid,
} from "@/app/integration/_components";
import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  MetricTabsDisplay,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
import { Separator } from "@/components/ui/separator";
import { Sheet } from "@/components/ui/sheet";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardSheetEdgeTrigger } from "./dashboard-sheet-edge-trigger";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface DashboardSidebarProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
  onMetricCreated?: () => void;
}

function NonModalSheetContent({
  className,
  children,
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: "top" | "right" | "bottom" | "left";
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Content
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-[51] flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          className,
        )}
        {...props}
      >
        <SheetPrimitive.Title className="sr-only">
          Dashboard Sidebar
        </SheetPrimitive.Title>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function DashboardSidebar({
  teamId,
  initialIntegrations,
  onMetricCreated,
}: DashboardSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

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
          "fixed inset-0 z-[51] bg-black/40 backdrop-blur-sm transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setIsOpen(false)}
      />

      <DashboardSheetEdgeTrigger
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <NonModalSheetContent
          side="right"
          className="w-[40rem] overflow-hidden p-0"
        >
          <div className="flex h-full flex-col">
            <div className="flex-shrink-0 border-b px-6 py-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold tracking-tight">
                  Manage Integrations
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
                  gridCols={2}
                  showMetricDialogs={true}
                  onMetricCreated={onMetricCreated}
                  teamId={teamId}
                  MetricDialogs={{
                    github: GitHubMetricDialog,
                    posthog: PostHogMetricDialog,
                    youtube: YouTubeMetricDialog,
                    "google-sheet": GoogleSheetsMetricDialog,
                  }}
                />
              </div>

              <Separator />

              {/* Metrics Tabs */}
              <div className="space-y-4">
                <h3 className="font-semibold">Your Metrics</h3>
                <MetricTabsDisplay
                  teamId={teamId}
                  className="w-full"
                  tabsListClassName="flex gap-2 bg-transparent overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 [&::-webkit-scrollbar-track]:bg-transparent"
                  tabTriggerClassName="text-xs border shrink-0"
                  renderMetricCard={(metric) => (
                    <div
                      key={metric.id}
                      className="group hover:bg-accent/50 relative flex items-center gap-3 rounded-lg border p-3"
                    >
                      <div
                        className={cn(
                          "h-8 w-1 rounded-full",
                          getPlatformConfig(
                            metric.integration?.integrationId ?? "unknown",
                          ).bgColor,
                        )}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {metric.name}
                        </p>
                        <p className="text-muted-foreground text-xs capitalize">
                          {metric.integration?.integrationId ?? "unknown"}
                        </p>
                      </div>
                    </div>
                  )}
                />
              </div>
            </div>
          </div>
        </NonModalSheetContent>
      </Sheet>
    </>
  );
}
