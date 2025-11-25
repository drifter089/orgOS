"use client";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";

import { DashboardMetricCard } from "./dashboard-metric-card";

type DashboardMetric = RouterOutputs["dashboard"]["getByTeam"][number];

interface DashboardClientProps {
  teamId: string;
  initialDashboardMetrics: DashboardMetric[];
}

export function DashboardClient({
  teamId,
  initialDashboardMetrics,
}: DashboardClientProps) {
  const utils = api.useUtils();

  const { data: dashboardMetrics } = api.dashboard.getByTeam.useQuery(
    { teamId },
    { initialData: initialDashboardMetrics },
  );

  const importAllMutation = api.dashboard.importAllAvailableMetrics.useMutation(
    {
      onSuccess: (result) => {
        void utils.dashboard.getByTeam.invalidate({ teamId });
        toast.success(result.message);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    },
  );

  const handleImportAll = () => {
    importAllMutation.mutate({ teamId });
  };

  if (!dashboardMetrics || dashboardMetrics.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold">No metrics on dashboard</h3>
          <p className="text-muted-foreground max-w-md text-sm">
            Add metrics to your team&apos;s dashboard to start visualizing your
            data. You can import all available team metrics or add them
            individually from the sidebar.
          </p>
        </div>
        <Button
          onClick={handleImportAll}
          disabled={importAllMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          {importAllMutation.isPending
            ? "Importing..."
            : "Import All Team Metrics"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Import button if there are metrics */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={handleImportAll}
          disabled={importAllMutation.isPending}
        >
          <Plus className="mr-2 h-4 w-4" />
          Import More Metrics
        </Button>
      </div>

      {/* Dashboard Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {dashboardMetrics.map((dashboardMetric) => (
          <DashboardMetricCard
            key={dashboardMetric.id}
            dashboardMetric={dashboardMetric}
            teamId={teamId}
          />
        ))}
      </div>
    </div>
  );
}
