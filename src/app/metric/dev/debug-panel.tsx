"use client";

import { useState } from "react";

import { ChevronDown, ChevronUp, Database } from "lucide-react";

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

type Metrics = RouterOutputs["metric"]["getAll"];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface MetricDebugPanelProps {
  initialMetrics: Metrics;
  initialIntegrations: IntegrationsWithStats;
}

export function MetricDebugPanel({
  initialMetrics,
  initialIntegrations,
}: MetricDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Use TanStack Query to keep data in sync
  const { data: metrics } = api.metric.getAll.useQuery(undefined, {
    initialData: initialMetrics,
  });
  const { data: integrationsData } = api.integration.listWithStats.useQuery(
    undefined,
    {
      initialData: initialIntegrations,
    },
  );

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
                  Raw metrics and integrations data for development
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
            {/* All Metrics Data */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">
                All Metrics ({metrics?.length ?? 0})
              </h3>
              <JsonViewer data={metrics} maxPreviewHeight="300px" />
            </div>

            {/* Integrations Data */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Integrations</h3>
              <JsonViewer data={integrationsData} maxPreviewHeight="200px" />
            </div>

            {/* Individual Metric Details */}
            {metrics && metrics.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-medium">Metric Details</h3>
                {metrics
                  .filter((m) => m.integrationId)
                  .map((metric) => (
                    <Card key={metric.id} className="bg-muted/30">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">
                            {metric.name}
                          </CardTitle>
                          <div className="flex gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {metric.type}
                            </Badge>
                            {metric.metricTemplate && (
                              <Badge variant="outline" className="text-xs">
                                {metric.metricTemplate}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Endpoint Config */}
                        {metric.endpointConfig && (
                          <div className="space-y-2">
                            <div className="text-sm font-medium">
                              Endpoint Config
                            </div>
                            <JsonViewer
                              data={metric.endpointConfig}
                              maxPreviewHeight="150px"
                            />
                          </div>
                        )}

                        {/* Full Metric Object */}
                        <div className="space-y-2">
                          <div className="text-sm font-medium">
                            Full Metric Object
                          </div>
                          <JsonViewer data={metric} maxPreviewHeight="200px" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
