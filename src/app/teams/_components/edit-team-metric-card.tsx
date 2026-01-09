"use client";

import { Loader2, Settings } from "lucide-react";

import { MetricSettingsDialog } from "@/app/dashboard/[teamId]/_components/metric-settings-dialog";
import { type DashboardChart } from "@/app/metric/_components";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

interface EditTeamMetricCardProps {
  dashboardChart: DashboardChart;
  teamId: string;
}

export function EditTeamMetricCard({
  dashboardChart,
  teamId,
}: EditTeamMetricCardProps) {
  const metric = dashboardChart.metric;
  const isProcessing = !!metric.refreshStatus;

  return (
    <div
      className={cn(
        "group hover:bg-accent/50 relative flex items-center gap-3 rounded-lg border p-3",
        isProcessing && "opacity-70",
      )}
    >
      <div
        className={cn(
          "h-8 w-1.5 rounded-sm",
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
        </div>
        <p className="text-muted-foreground text-xs capitalize">
          {metric.integration?.providerId ?? "manual"}
        </p>
      </div>

      <div className="flex shrink-0 items-center">
        <MetricSettingsDialog
          dashboardChart={dashboardChart}
          teamId={teamId}
          trigger={
            <Button
              variant="outline"
              size="icon"
              className="border-border hover:border-primary/50 h-7 w-7 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-105"
              onClick={(e) => e.stopPropagation()}
              title="Metric settings"
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          }
        />
      </div>
    </div>
  );
}
