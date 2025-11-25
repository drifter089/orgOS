"use client";

import { useState } from "react";

import * as SheetPrimitive from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";

import { IntegrationGrid } from "@/app/integration/_components";
import {
  GitHubMetricDialog,
  GoogleSheetsMetricDialog,
  PostHogMetricDialog,
  YouTubeMetricDialog,
} from "@/app/metric/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardSidebarTrigger } from "./dashboard-sidebar-trigger";

type Metric = RouterOutputs["metric"]["getByTeam"][number];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface DashboardSidebarProps {
  teamId: string;
  metrics: Metric[];
  integrationsData: IntegrationsWithStats;
}

/**
 * Custom sheet content without modal overlay
 * Used for non-modal sidebar that allows dashboard interaction
 */
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
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-40 flex flex-col gap-4 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
          side === "right" &&
            "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full border-l",
          side === "left" &&
            "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full border-r",
          className,
        )}
        {...props}
      >
        {/* Hidden title for accessibility */}
        <SheetPrimitive.Title className="sr-only">
          Dashboard Sidebar
        </SheetPrimitive.Title>
        {children}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

/**
 * Sheet-based sidebar for dashboard metric management
 * Closed by default to allow data prefetching while user interacts with dashboard
 */
export function DashboardSidebar({
  teamId,
  metrics,
  integrationsData,
}: DashboardSidebarProps) {
  // Closed by default to allow data prefetching
  const [isOpen, setIsOpen] = useState(false);

  const integrations = integrationsData.active;
  const githubIntegration = integrations.find(
    (i) => i.integrationId === "github",
  );
  const youtubeIntegration = integrations.find(
    (i) => i.integrationId === "google",
  );
  const sheetsIntegration = integrations.find(
    (i) => i.integrationId === "google",
  );
  const posthogIntegration = integrations.find(
    (i) => i.integrationId === "posthog",
  );

  return (
    <>
      {/* Circular Edge Trigger Button */}
      <DashboardSidebarTrigger
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
      />

      {/* Sheet Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <NonModalSheetContent
          side="right"
          className="w-[24rem] overflow-hidden p-0"
        >
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex-shrink-0 border-b px-6 py-4">
              <h2 className="text-2xl font-bold tracking-tight">Metrics</h2>
              <p className="text-muted-foreground mt-1 text-sm">
                Manage team metrics and integrations
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="[&::-webkit-scrollbar-thumb]:bg-border/40 hover:[&::-webkit-scrollbar-thumb]:bg-border/60 flex-1 space-y-6 overflow-y-auto px-6 py-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent">
              {/* Integrations Section */}
              <div>
                <h3 className="text-muted-foreground mb-3 text-xs font-semibold tracking-wider uppercase">
                  Organization Integrations
                </h3>
                <IntegrationGrid initialData={integrationsData} gridCols={2} />
              </div>

              {/* Metrics Section with Creation Dialogs */}
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Team Metrics
                  </h3>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {metrics.length}
                  </Badge>
                </div>

                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="mb-4 grid w-full grid-cols-3">
                    <TabsTrigger value="all" className="text-xs">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="github" className="text-xs">
                      GitHub
                    </TabsTrigger>
                    <TabsTrigger value="other" className="text-xs">
                      Other
                    </TabsTrigger>
                  </TabsList>

                  {/* All Metrics Tab */}
                  <TabsContent value="all" className="space-y-2">
                    {metrics.length === 0 ? (
                      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center">
                        <p className="text-sm font-medium">No metrics yet</p>
                        <p className="text-xs">
                          Create metrics from the tabs above
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {metrics.map((metric) => (
                          <div
                            key={metric.id}
                            className="bg-card hover:bg-accent/50 rounded-lg border p-3 shadow-sm transition-colors hover:shadow"
                          >
                            <p className="text-sm leading-tight font-medium">
                              {metric.name}
                            </p>
                            {metric.description && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {metric.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>

                  {/* GitHub Tab */}
                  <TabsContent value="github" className="space-y-3">
                    {githubIntegration ? (
                      <GitHubMetricDialog
                        teamId={teamId}
                        trigger={
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Create GitHub Metric
                          </Button>
                        }
                      />
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center justify-center rounded-lg border border-dashed py-6 text-center">
                        <p className="text-sm">
                          Connect GitHub integration first
                        </p>
                      </div>
                    )}
                    <div className="space-y-2">
                      {metrics
                        .filter(
                          (m) => m.integration?.integrationId === "github",
                        )
                        .map((metric) => (
                          <div
                            key={metric.id}
                            className="bg-card hover:bg-accent/50 rounded-lg border p-3 shadow-sm transition-colors hover:shadow"
                          >
                            <p className="text-sm leading-tight font-medium">
                              {metric.name}
                            </p>
                            {metric.description && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {metric.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </TabsContent>

                  {/* Other Platforms Tab */}
                  <TabsContent value="other" className="space-y-3">
                    <div className="space-y-2">
                      {youtubeIntegration && (
                        <YouTubeMetricDialog
                          teamId={teamId}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              YouTube Metric
                            </Button>
                          }
                        />
                      )}
                      {sheetsIntegration && (
                        <GoogleSheetsMetricDialog
                          teamId={teamId}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Google Sheets Metric
                            </Button>
                          }
                        />
                      )}
                      {posthogIntegration && (
                        <PostHogMetricDialog
                          teamId={teamId}
                          trigger={
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              PostHog Metric
                            </Button>
                          }
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      {metrics
                        .filter(
                          (m) => m.integration?.integrationId !== "github",
                        )
                        .map((metric) => (
                          <div
                            key={metric.id}
                            className="bg-card hover:bg-accent/50 rounded-lg border p-3 shadow-sm transition-colors hover:shadow"
                          >
                            <p className="text-sm leading-tight font-medium">
                              {metric.name}
                            </p>
                            {metric.description && (
                              <p className="text-muted-foreground mt-1 text-xs">
                                {metric.description}
                              </p>
                            )}
                          </div>
                        ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </NonModalSheetContent>
      </Sheet>
    </>
  );
}
