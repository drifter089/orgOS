"use client";

import { useState } from "react";

import {
  ChevronDown,
  ChevronUp,
  Database,
  Loader2,
  Sparkles,
} from "lucide-react";

import { JsonViewer } from "@/components/json-viewer";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type DashboardMetrics = RouterOutputs["dashboard"]["getDashboardMetrics"];

interface DashboardDebugPanelProps {
  initialDashboardMetrics: DashboardMetrics;
}

export function DashboardDebugPanel({
  initialDashboardMetrics,
}: DashboardDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [fetchedDataMap, setFetchedDataMap] = useState<Record<string, unknown>>(
    {},
  );
  const [transformHints, setTransformHints] = useState<Record<string, string>>(
    {},
  );

  const utils = api.useUtils();

  const { data: dashboardMetrics } = api.dashboard.getDashboardMetrics.useQuery(
    undefined,
    {
      initialData: initialDashboardMetrics,
    },
  );

  const fetchDataMutation = api.dashboard.fetchMetricData.useMutation({
    onSuccess: (result, variables) => {
      setFetchedDataMap((prev) => ({
        ...prev,
        [variables.metricId]: result.data,
      }));
    },
  });

  const transformMutation = api.dashboard.transformMetricForChart.useMutation();
  const updateConfigMutation = api.dashboard.updateGraphConfig.useMutation({
    onSuccess: (updatedDashboardMetric) => {
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === updatedDashboardMetric.id ? updatedDashboardMetric : dm,
        ),
      );
    },
  });

  const handleFetchData = (metricId: string) => {
    fetchDataMutation.mutate({ metricId });
  };

  const handleTransform = async (
    metricId: string,
    dashboardMetricId: string,
  ) => {
    const fetchedData = fetchedDataMap[metricId];
    const hint = transformHints[metricId] ?? "";

    const result = await transformMutation.mutateAsync({
      metricId,
      rawData: fetchedData ?? undefined,
      userHint: hint || undefined,
    });

    if (result.success && result.data) {
      await updateConfigMutation.mutateAsync({
        dashboardMetricId,
        chartTransform: result.data,
      });
      setTransformHints((prev) => ({ ...prev, [metricId]: "" }));
    }
  };

  return (
    <Card className="mt-8 border-yellow-200 dark:border-yellow-800">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader>
          <CollapsibleTrigger asChild>
            <div className="flex cursor-pointer items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-4 w-4" />
                  Debug Panel
                </CardTitle>
                <CardDescription>
                  Raw data and chart configurations for development
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6">
            {/* Full Dashboard Metrics Data */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                All Dashboard Metrics ({dashboardMetrics.length})
              </h3>
              <JsonViewer data={dashboardMetrics} maxPreviewHeight="300px" />
            </div>

            {/* Individual Metric Debug Cards */}
            {dashboardMetrics.map((dm) => {
              const fetchedData = fetchedDataMap[dm.metric.id];
              const canTransform = fetchedData !== undefined;
              const isTransforming =
                (transformMutation.isPending &&
                  transformMutation.variables?.metricId === dm.metric.id) ||
                (updateConfigMutation.isPending &&
                  updateConfigMutation.variables?.dashboardMetricId === dm.id);

              return (
                <Card key={dm.id} className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {dm.metric.name}
                      </CardTitle>
                      <div className="flex gap-2">
                        {dm.metric.integration && (
                          <Badge variant="secondary" className="text-xs">
                            {dm.metric.integration.integrationId}
                          </Badge>
                        )}
                        {dm.graphConfig && (
                          <Badge variant="outline" className="text-xs">
                            Has Chart
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {dm.metric.integrationId && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleFetchData(dm.metric.id)}
                          disabled={
                            fetchDataMutation.isPending &&
                            fetchDataMutation.variables?.metricId ===
                              dm.metric.id
                          }
                        >
                          <Database className="mr-2 h-3 w-3" />
                          {fetchDataMutation.isPending &&
                          fetchDataMutation.variables?.metricId === dm.metric.id
                            ? "Fetching..."
                            : "Fetch Data"}
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleTransform(dm.metric.id, dm.id)}
                          disabled={!canTransform || isTransforming}
                        >
                          {isTransforming ? (
                            <>
                              <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                              Transforming...
                            </>
                          ) : (
                            <>
                              <Sparkles className="mr-2 h-3 w-3" />
                              Transform
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {canTransform && (
                      <Input
                        placeholder="Hint: 'show as pie chart' or 'group by week'"
                        value={transformHints[dm.metric.id] ?? ""}
                        onChange={(e) =>
                          setTransformHints((prev) => ({
                            ...prev,
                            [dm.metric.id]: e.target.value,
                          }))
                        }
                        disabled={isTransforming}
                        className="text-sm"
                      />
                    )}

                    {/* Fetched Raw Data */}
                    {fetchedData !== undefined && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Raw Fetched Data
                        </div>
                        <JsonViewer
                          data={fetchedData}
                          maxPreviewHeight="200px"
                        />
                      </div>
                    )}

                    {/* Graph Config / Chart Transform */}
                    {dm.graphConfig && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Sparkles className="h-3 w-3" />
                          Chart Transform Config
                        </div>
                        <JsonViewer
                          data={dm.graphConfig}
                          maxPreviewHeight="200px"
                        />
                      </div>
                    )}

                    {/* Metric Endpoint Config */}
                    {dm.metric.endpointConfig && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium">
                          Endpoint Config
                        </div>
                        <JsonViewer
                          data={dm.metric.endpointConfig}
                          maxPreviewHeight="150px"
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
