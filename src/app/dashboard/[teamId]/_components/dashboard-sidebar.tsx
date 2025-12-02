"use client";

import { useEffect, useState } from "react";

import { Loader2 } from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardSheetEdgeTrigger } from "./dashboard-sheet-edge-trigger";

type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface DashboardSidebarProps {
  teamId: string;
  initialIntegrations: IntegrationsWithStats;
  onMetricCreated?: () => void;
  side?: "left" | "right";
}

export function DashboardSidebar({
  teamId,
  initialIntegrations,
  onMetricCreated,
  side = "right",
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
                  renderMetricCard={(metric) => {
                    const isSyncing = metric.id.startsWith("temp-");
                    return (
                      <div
                        key={metric.id}
                        className={cn(
                          "group hover:bg-accent/50 relative flex items-center gap-3 rounded-lg border p-3",
                          isSyncing && "opacity-70",
                        )}
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
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium">
                              {metric.name}
                            </p>
                            {isSyncing && (
                              <Badge
                                variant="secondary"
                                className="shrink-0 text-xs"
                              >
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                Syncing
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-xs capitalize">
                            {metric.integration?.integrationId ?? "unknown"}
                          </p>
                        </div>
                      </div>
                    );
                  }}
                />
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
