"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type Metric = RouterOutputs["metric"]["getAll"][0];

type MetricType = "percentage" | "number" | "duration" | "rate";

interface MetricFormData {
  name: string;
  description: string;
  type: MetricType;
  targetValue: string;
  unit: string;
}

const initialFormData: MetricFormData = {
  name: "",
  description: "",
  type: "number",
  targetValue: "",
  unit: "",
};

interface EditMetricDialogProps {
  metric: Metric | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function EditMetricDialog({
  metric,
  open,
  onOpenChange,
  onSuccess,
}: EditMetricDialogProps) {
  const [formData, setFormData] = useState<MetricFormData>(initialFormData);

  const utils = api.useUtils();

  // Update form data when metric changes
  useEffect(() => {
    if (metric) {
      setFormData({
        name: metric.name,
        description: metric.description ?? "",
        type: metric.type as MetricType,
        targetValue: metric.targetValue?.toString() ?? "",
        unit: metric.unit ?? "",
      });
    } else {
      setFormData(initialFormData);
    }
  }, [metric]);

  // Update mutation with optimistic update
  const updateMutation = api.metric.update.useMutation({
    onMutate: async (updatedMetric) => {
      // Cancel outgoing refetches
      await utils.metric.getAll.cancel();

      // Snapshot previous data
      const previousMetrics = utils.metric.getAll.getData();

      // Optimistically update the metric
      if (previousMetrics) {
        utils.metric.getAll.setData(
          undefined,
          previousMetrics.map((m) =>
            m.id === updatedMetric.id
              ? {
                  ...m,
                  name: updatedMetric.name ?? m.name,
                  description: updatedMetric.description ?? m.description,
                  targetValue: updatedMetric.targetValue ?? m.targetValue,
                  unit: updatedMetric.unit ?? m.unit,
                  updatedAt: new Date(),
                }
              : m,
          ),
        );
      }

      // Close dialog immediately
      onOpenChange(false);
      setFormData(initialFormData);

      return { previousMetrics };
    },
    onError: (error, _updatedMetric, context) => {
      // Revert on error
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      console.error("Error updating metric:", error.message);
    },
    onSuccess: (updatedMetric) => {
      // Update with server data to ensure consistency
      utils.metric.getAll.setData(undefined, (old) =>
        old?.map((m) => (m.id === updatedMetric.id ? updatedMetric : m)),
      );
      onSuccess();
    },
    onSettled: async () => {
      // Sync with server to ensure consistency
      await utils.metric.getAll.invalidate();
    },
  });

  const handleUpdate = () => {
    if (!metric) return;

    const targetValue = formData.targetValue
      ? parseFloat(formData.targetValue)
      : undefined;

    updateMutation.mutate({
      id: metric.id,
      name: formData.name,
      description: formData.description || undefined,
      targetValue,
      unit: formData.unit || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Metric</DialogTitle>
          <DialogDescription>Update the metric details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Name *</Label>
            <Input
              id="edit-name"
              placeholder="Customer Satisfaction"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              placeholder="Percentage of satisfied customers based on surveys"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-targetValue">Target Value</Label>
              <Input
                id="edit-targetValue"
                type="number"
                step="0.01"
                placeholder="95"
                value={formData.targetValue}
                onChange={(e) =>
                  setFormData({ ...formData, targetValue: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit</Label>
              <Input
                id="edit-unit"
                placeholder="e.g., ms, req/s, users"
                value={formData.unit}
                onChange={(e) =>
                  setFormData({ ...formData, unit: e.target.value })
                }
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFormData(initialFormData);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdate}
            disabled={!formData.name || updateMutation.isPending}
          >
            {updateMutation.isPending ? "Updating..." : "Update Metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
