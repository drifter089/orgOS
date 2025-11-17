"use client";

import { useState } from "react";

import { Check, Loader2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/trpc/react";

interface MetricSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetricSelector({ open, onOpenChange }: MetricSelectorProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [graphType, setGraphType] = useState<string>("line");

  const utils = api.useUtils();

  // Fetch available metrics (not yet on dashboard)
  const { data: availableMetrics, isLoading } =
    api.dashboard.getAvailableMetrics.useQuery(undefined, {
      enabled: open,
    });

  // Add metric to dashboard mutation
  const addMetricMutation = api.dashboard.addMetricToDashboard.useMutation({
    onSuccess: async () => {
      // Invalidate and refetch dashboard metrics
      await utils.dashboard.getDashboardMetrics.invalidate();
      await utils.dashboard.getAvailableMetrics.invalidate();

      // Reset form and close dialog
      setSelectedMetric(null);
      setGraphType("line");
      onOpenChange(false);
    },
  });

  const handleAddMetric = () => {
    if (!selectedMetric) return;

    addMetricMutation.mutate({
      metricId: selectedMetric,
      graphType: graphType as "line" | "bar" | "area" | "pie" | "kpi",
    });
  };

  const selectedMetricData = availableMetrics?.find(
    (m) => m.id === selectedMetric,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Metric to Dashboard</DialogTitle>
          <DialogDescription>
            Select a metric and choose how you want to visualize it
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Metric Selection */}
          <div className="space-y-2">
            <Label htmlFor="metric-select">Select Metric</Label>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
              </div>
            ) : availableMetrics?.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                <p>No metrics available to add.</p>
                <p className="mt-2 text-sm">
                  All metrics are already on your dashboard or you haven&apos;t
                  created any metrics yet.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableMetrics?.map((metric) => (
                  <button
                    key={metric.id}
                    onClick={() => setSelectedMetric(metric.id)}
                    className={`hover:bg-accent w-full rounded-lg border-2 p-3 text-left transition-colors ${
                      selectedMetric === metric.id
                        ? "border-primary bg-accent"
                        : "border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-medium">
                            {metric.name}
                          </h4>
                          {metric.integration && (
                            <Badge variant="secondary" className="text-xs">
                              {metric.integration.integrationId}
                            </Badge>
                          )}
                        </div>
                        {metric.description && (
                          <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                            {metric.description}
                          </p>
                        )}
                        <div className="text-muted-foreground mt-2 flex gap-2 text-xs">
                          <span>Type: {metric.type}</span>
                          {metric.currentValue !== null && (
                            <span>
                              Current: {metric.currentValue}
                              {metric.unit && ` ${metric.unit}`}
                            </span>
                          )}
                        </div>
                      </div>
                      {selectedMetric === metric.id && (
                        <Check className="text-primary h-5 w-5 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Graph Type Selection */}
          {selectedMetricData && (
            <div className="space-y-2">
              <Label htmlFor="graph-type">Graph Type</Label>
              <Select value={graphType} onValueChange={setGraphType}>
                <SelectTrigger id="graph-type">
                  <SelectValue placeholder="Select graph type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div>
                      <div className="font-medium">Line Chart</div>
                      <div className="text-muted-foreground text-xs">
                        Best for time-series data and trends
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div>
                      <div className="font-medium">Bar Chart</div>
                      <div className="text-muted-foreground text-xs">
                        Compare values across categories
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div>
                      <div className="font-medium">Area Chart</div>
                      <div className="text-muted-foreground text-xs">
                        Show cumulative values over time
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div>
                      <div className="font-medium">Pie Chart</div>
                      <div className="text-muted-foreground text-xs">
                        Show proportions and percentages
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="kpi">
                    <div>
                      <div className="font-medium">KPI Card</div>
                      <div className="text-muted-foreground text-xs">
                        Display single value prominently
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMetric(null);
              setGraphType("line");
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAddMetric}
            disabled={!selectedMetric || addMetricMutation.isPending}
          >
            {addMetricMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              "Add to Dashboard"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
