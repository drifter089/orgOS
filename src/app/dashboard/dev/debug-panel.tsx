"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Database, Sparkles } from "lucide-react";

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

  const handleFetchData = (metricId: string) => {
    fetchDataMutation.mutate({ metricId });
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
                    {/* Fetch Data Button */}
                    {dm.metric.integrationId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleFetchData(dm.metric.id)}
                        disabled={fetchDataMutation.isPending}
                      >
                        <Database className="mr-2 h-3 w-3" />
                        {fetchDataMutation.isPending &&
                        fetchDataMutation.variables?.metricId === dm.metric.id
                          ? "Fetching..."
                          : "Fetch Raw Data"}
                      </Button>
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
