"use client";

import { Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLatestMetricValue } from "@/lib/metrics/get-latest-value";
import { getPlatformConfig } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

import type { ChartTransformResult } from "./dashboard-metric-card";

interface DashboardMetricValueProps {
  title: string;
  chartTransform: ChartTransformResult | null;
  hasChartData: boolean;
  isIntegrationMetric: boolean;
  isPending: boolean;
  isProcessing: boolean;
  integrationId?: string | null;
}

/**
 * Formats a number for display with appropriate units
 */
function formatValue(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(2);
}

export function DashboardMetricValue({
  title,
  chartTransform,
  hasChartData,
  isIntegrationMetric,
  isPending,
  isProcessing,
  integrationId,
}: DashboardMetricValueProps) {
  const platformConfig = integrationId
    ? getPlatformConfig(integrationId)
    : null;

  const currentValue = getLatestMetricValue(chartTransform);

  return (
    <Card
      className={`flex h-full flex-col ${isPending ? "animate-pulse opacity-70" : ""}`}
    >
      <CardHeader className="flex-shrink-0 pb-2">
        <div className="flex items-center gap-2 pr-24">
          <CardTitle className="truncate text-lg">{title}</CardTitle>
          {platformConfig && (
            <Badge
              className={cn(
                "shrink-0 text-xs",
                platformConfig.bgColor,
                platformConfig.textColor,
              )}
            >
              {platformConfig.name}
            </Badge>
          )}
          {(isPending || isProcessing) && (
            <Badge
              variant="outline"
              className="text-muted-foreground ml-auto shrink-0 text-xs"
            >
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {isPending ? "Saving..." : "Processing..."}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col items-center justify-center overflow-hidden">
        {hasChartData && currentValue ? (
          <div className="flex flex-col items-center justify-center space-y-2">
            <span className="text-6xl font-bold tracking-tight">
              {formatValue(currentValue.value)}
            </span>
            <span className="text-muted-foreground text-sm">
              {currentValue.label}
            </span>
            {currentValue.date && (
              <span className="text-muted-foreground/70 text-xs">
                as of {currentValue.date}
              </span>
            )}
          </div>
        ) : !isProcessing ? (
          <div className="text-muted-foreground flex flex-1 items-center justify-center rounded-md border border-dashed text-center text-sm">
            {isIntegrationMetric ? "Loading value..." : "No value available"}
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-md border border-dashed">
            <div className="text-center">
              <Loader2 className="text-muted-foreground mx-auto h-6 w-6 animate-spin" />
              <p className="text-muted-foreground mt-2 text-sm">
                Loading value...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
