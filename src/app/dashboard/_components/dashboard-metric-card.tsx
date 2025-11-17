"use client";

import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

// Infer types from tRPC router
type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];
type DashboardMetricWithRelations = DashboardMetrics[number];

interface DashboardMetricCardProps {
  dashboardMetric: DashboardMetricWithRelations;
}

export function DashboardMetricCard({
  dashboardMetric,
}: DashboardMetricCardProps) {
  const [jsonExpanded, setJsonExpanded] = useState(false);

  const utils = api.useUtils();

  // Update graph type mutation
  const updateGraphTypeMutation = api.dashboard.updateGraphConfig.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getDashboardMetrics.invalidate();
    },
  });

  // Refresh metric value mutation (from metric router)
  const refreshMetricMutation = api.metric.refreshMetricValue.useMutation({
    onSuccess: async () => {
      await utils.dashboard.getDashboardMetrics.invalidate();
    },
  });

  // Remove from dashboard mutation
  const removeMetricMutation =
    api.dashboard.removeMetricFromDashboard.useMutation({
      onSuccess: async () => {
        await utils.dashboard.getDashboardMetrics.invalidate();
        await utils.dashboard.getAvailableMetrics.invalidate();
      },
    });

  const handleGraphTypeChange = (newType: string) => {
    updateGraphTypeMutation.mutate({
      dashboardMetricId: dashboardMetric.id,
      graphType: newType as "line" | "bar" | "area" | "pie" | "kpi",
    });
  };

  const handleRefresh = () => {
    if (!dashboardMetric.metric.integrationId) return;

    refreshMetricMutation.mutate({
      id: dashboardMetric.metric.id,
    });
  };

  const handleRemove = () => {
    if (confirm("Remove this metric from dashboard?")) {
      removeMetricMutation.mutate({
        dashboardMetricId: dashboardMetric.id,
      });
    }
  };

  const { metric } = dashboardMetric;
  const isIntegrationMetric = !!metric.integrationId;

  // Prepare JSON data for display
  const jsonData = {
    metricInfo: {
      id: metric.id,
      name: metric.name,
      type: metric.type,
      unit: metric.unit,
      currentValue: metric.currentValue,
      targetValue: metric.targetValue,
      metricTemplate: metric.metricTemplate,
    },
    endpointConfig: metric.endpointConfig,
    dashboardConfig: {
      graphType: dashboardMetric.graphType,
      graphConfig: dashboardMetric.graphConfig,
    },
    lastFetchedAt: metric.lastFetchedAt,
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-lg">{metric.name}</CardTitle>
              {metric.integration && (
                <Badge variant="secondary" className="text-xs">
                  {metric.integration.integrationId}
                </Badge>
              )}
            </div>
            {metric.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {metric.description}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRemove}
            disabled={removeMetricMutation.isPending}
            className="flex-shrink-0"
          >
            {removeMetricMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="text-muted-foreground hover:text-destructive h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Metric Stats */}
        <div className="text-muted-foreground mt-2 flex gap-4 text-sm">
          <div>
            <span className="font-medium">Current: </span>
            {metric.currentValue !== null
              ? `${metric.currentValue}${metric.unit ? ` ${metric.unit}` : ""}`
              : "N/A"}
          </div>
          {metric.targetValue !== null && (
            <div>
              <span className="font-medium">Target: </span>
              {metric.targetValue}
              {metric.unit ? ` ${metric.unit}` : ""}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Graph Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Graph Type</label>
          <Select
            value={dashboardMetric.graphType}
            onValueChange={handleGraphTypeChange}
            disabled={updateGraphTypeMutation.isPending}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Line Chart</SelectItem>
              <SelectItem value="bar">Bar Chart</SelectItem>
              <SelectItem value="area">Area Chart</SelectItem>
              <SelectItem value="pie">Pie Chart</SelectItem>
              <SelectItem value="kpi">KPI Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* JSON Data Viewer */}
        <div className="space-y-2">
          <button
            onClick={() => setJsonExpanded(!jsonExpanded)}
            className="hover:text-primary flex items-center gap-2 text-sm font-medium transition-colors"
          >
            {jsonExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
            Raw Data
            {!jsonExpanded && (
              <span className="text-muted-foreground text-xs font-normal">
                (Click to expand)
              </span>
            )}
          </button>

          {jsonExpanded && (
            <div className="rounded-md border">
              <pre className="bg-muted/50 max-h-96 overflow-auto p-3 text-xs">
                {JSON.stringify(jsonData, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          {isIntegrationMetric && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshMetricMutation.isPending}
              className="flex-1"
            >
              {refreshMetricMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-3 w-3" />
                  Refresh Data
                </>
              )}
            </Button>
          )}
        </div>

        {/* Last Fetched */}
        {metric.lastFetchedAt && (
          <div className="text-muted-foreground text-xs">
            Last updated: {new Date(metric.lastFetchedAt).toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
