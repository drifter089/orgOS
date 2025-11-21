"use client";

import { useState } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/trpc/react";

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

interface CreateManualMetricDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateManualMetricDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateManualMetricDialogProps) {
  const [formData, setFormData] = useState<MetricFormData>(initialFormData);

  const utils = api.useUtils();

  // Create mutation with optimistic update
  const createMutation = api.metric.create.useMutation({
    onMutate: async (newMetric) => {
      // Cancel outgoing refetches
      await utils.metric.getAll.cancel();

      // Snapshot previous data
      const previousMetrics = utils.metric.getAll.getData();

      // Optimistically add the new metric with temp ID
      if (previousMetrics) {
        utils.metric.getAll.setData(undefined, [
          ...previousMetrics,
          {
            id: `temp-${Date.now()}`,
            name: newMetric.name,
            description: newMetric.description ?? null,
            type: newMetric.type,
            targetValue: newMetric.targetValue ?? null,
            currentValue: null,
            unit: newMetric.unit ?? null,
            organizationId: "",
            integrationId: null,
            metricTemplate: null,
            endpointConfig: null,
            lastFetchedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ]);
      }

      // Close dialog immediately for instant feedback
      onOpenChange(false);
      setFormData(initialFormData);

      return { previousMetrics };
    },
    onError: (error, _newMetric, context) => {
      // Revert on error
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      console.error("Error creating metric:", error.message);
    },
    onSuccess: (newMetric) => {
      // Replace temp entry with real server data
      utils.metric.getAll.setData(undefined, (old) => {
        if (!old) return [newMetric];
        return old.filter((m) => !m.id.startsWith("temp-")).concat(newMetric);
      });
      onSuccess();
    },
    onSettled: async () => {
      // Sync with server to ensure consistency
      await utils.metric.getAll.invalidate();
    },
  });

  const handleCreate = () => {
    const targetValue = formData.targetValue
      ? parseFloat(formData.targetValue)
      : undefined;

    createMutation.mutate({
      name: formData.name,
      description: formData.description || undefined,
      type: formData.type,
      targetValue,
      unit: formData.unit || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Manual Metric</DialogTitle>
          <DialogDescription>
            Define a new metric to track manually for your organization
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              placeholder="Customer Satisfaction"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Percentage of satisfied customers based on surveys"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Type *</Label>
              <Select
                value={formData.type}
                onValueChange={(value) =>
                  setFormData({ ...formData, type: value as MetricType })
                }
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="duration">Duration</SelectItem>
                  <SelectItem value="rate">Rate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="targetValue">Target Value</Label>
              <Input
                id="targetValue"
                type="number"
                step="0.01"
                placeholder="95"
                value={formData.targetValue}
                onChange={(e) =>
                  setFormData({ ...formData, targetValue: e.target.value })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
              id="unit"
              placeholder="e.g., ms, req/s, users"
              value={formData.unit}
              onChange={(e) =>
                setFormData({ ...formData, unit: e.target.value })
              }
            />
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
            onClick={handleCreate}
            disabled={!formData.name || createMutation.isPending}
          >
            {createMutation.isPending ? "Creating..." : "Create Metric"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
