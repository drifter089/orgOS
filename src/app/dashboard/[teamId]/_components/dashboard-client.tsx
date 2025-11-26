"use client";

import { useEffect } from "react";

import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];

export interface DashboardClientHandle {
  triggerImport: () => void;
}

interface DashboardClientProps {
  teamId: string;
  initialDashboardMetrics: DashboardMetrics;
  autoTrigger?: boolean;
  onImportRef?: (handle: DashboardClientHandle) => void;
}

export function DashboardClient({
  teamId,
  initialDashboardMetrics,
  autoTrigger = true,
  onImportRef,
}: DashboardClientProps) {
  const utils = api.useUtils();

  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    { teamId },
    {
      initialData: initialDashboardMetrics,
    },
  );

  const importMutation = api.dashboard.importAllAvailableMetrics.useMutation({
    onSuccess: (result) => {
      if (result.newDashboardMetrics.length > 0) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old
            ? [...old, ...result.newDashboardMetrics]
            : result.newDashboardMetrics,
        );
      }
      toast.success(result.message);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleImportAll = () => {
    importMutation.mutate({ teamId });
  };

  useEffect(() => {
    if (onImportRef) {
      onImportRef({ triggerImport: handleImportAll });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onImportRef]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-muted-foreground text-sm">
            {dashboardMetrics.length === 0
              ? "No metrics on dashboard yet. Import all available metrics to get started."
              : `Showing ${dashboardMetrics.length} metric${dashboardMetrics.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button onClick={handleImportAll} disabled={importMutation.isPending}>
          {importMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Import New Metrics
        </Button>
      </div>

      {dashboardMetrics.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16">
          <div className="space-y-2 text-center">
            <h3 className="text-lg font-semibold">No metrics yet</h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Import all available metrics to your dashboard to start tracking
              and visualizing your data
            </p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={handleImportAll}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Import All Metrics
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {dashboardMetrics.map((dashboardMetric) => (
            <DashboardMetricCard
              key={dashboardMetric.id}
              dashboardMetric={dashboardMetric}
              autoTrigger={autoTrigger}
            />
          ))}
        </div>
      )}
    </div>
  );
}
