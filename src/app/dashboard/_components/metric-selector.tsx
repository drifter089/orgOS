"use client";

import { useState } from "react";

import { Check, Loader2, Plus } from "lucide-react";

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
import { api } from "@/trpc/react";

interface MetricSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MetricSelector({ open, onOpenChange }: MetricSelectorProps) {
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

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
      onOpenChange(false);
    },
  });

  const handleAddMetric = () => {
    if (!selectedMetric) return;

    // Just add the metric - no AI transformation
    addMetricMutation.mutate({
      metricId: selectedMetric,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add Metric to Dashboard</DialogTitle>
          <DialogDescription>
            Select a metric to add. You can then fetch its data and transform it
            with AI.
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
              <div className="max-h-[300px] space-y-2 overflow-y-auto">
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedMetric(null);
              onOpenChange(false);
            }}
            disabled={addMetricMutation.isPending}
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
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add to Dashboard
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
