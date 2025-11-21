"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { DynamicMetricCreator } from "./dynamic-metric-creator";
import { IntegrationMetricCard } from "./integration-metric-card";

type MetricType = "percentage" | "number" | "duration" | "rate";

// Infer types from tRPC router
type Metrics = RouterOutputs["metric"]["getAll"];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

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

interface MetricClientProps {
  initialMetrics: Metrics;
  initialIntegrations: IntegrationsWithStats;
}

export function MetricClient({
  initialMetrics,
  initialIntegrations,
}: MetricClientProps) {
  const [isCreateManualDialogOpen, setIsCreateManualDialogOpen] =
    useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MetricFormData>(initialFormData);
  const [status, setStatus] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [refreshingMetricId, setRefreshingMetricId] = useState<string | null>(
    null,
  );
  const [deletingMetricId, setDeletingMetricId] = useState<string | null>(null);

  const { confirm } = useConfirmation();
  const utils = api.useUtils();

  // Use initialData for instant page load
  const { data: metrics } = api.metric.getAll.useQuery(undefined, {
    initialData: initialMetrics,
  });
  const { data: integrationsData } = api.integration.listWithStats.useQuery(
    undefined,
    {
      initialData: initialIntegrations,
    },
  );
  const activeIntegrations = integrationsData?.active ?? [];

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
      setIsCreateManualDialogOpen(false);
      setFormData(initialFormData);

      return { previousMetrics };
    },
    onError: (error, _newMetric, context) => {
      // Revert on error
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      setStatus(`Error creating metric: ${error.message}`);
    },
    onSuccess: (newMetric) => {
      // Replace temp entry with real server data
      utils.metric.getAll.setData(undefined, (old) => {
        if (!old) return [newMetric];
        return old.filter((m) => !m.id.startsWith("temp-")).concat(newMetric);
      });
      setStatus("Metric created successfully!");
    },
    onSettled: async () => {
      // Sync with server to ensure consistency
      await utils.metric.getAll.invalidate();
    },
  });

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
      setIsEditDialogOpen(false);
      setEditingMetricId(null);
      setFormData(initialFormData);

      return { previousMetrics };
    },
    onError: (error, _updatedMetric, context) => {
      // Revert on error
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      setStatus(`Error updating metric: ${error.message}`);
    },
    onSuccess: (updatedMetric) => {
      // Update with server data to ensure consistency
      utils.metric.getAll.setData(undefined, (old) =>
        old?.map((m) => (m.id === updatedMetric.id ? updatedMetric : m)),
      );
      setStatus("Metric updated successfully!");
    },
    onSettled: async () => {
      // Sync with server to ensure consistency
      await utils.metric.getAll.invalidate();
    },
  });

  // Delete mutation with optimistic update
  const deleteMutation = api.metric.delete.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches to prevent overwriting optimistic update
      await utils.metric.getAll.cancel();

      // Snapshot previous data for rollback
      const previousMetrics = utils.metric.getAll.getData();

      // Optimistically remove the metric immediately
      if (previousMetrics) {
        utils.metric.getAll.setData(
          undefined,
          previousMetrics.filter((m) => m.id !== id),
        );
      }

      return { previousMetrics, deletedId: id };
    },
    onError: (error, _variables, context) => {
      // Revert to previous state on error
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      setDeletingMetricId(null);
      setStatus(`Error deleting metric: ${error.message}`);
    },
    onSuccess: () => {
      setDeletingMetricId(null);
      setStatus("Metric deleted successfully!");
    },
    onSettled: async () => {
      // Sync with server to ensure consistency
      await utils.metric.getAll.invalidate();
    },
  });

  // Refresh mutation with optimistic state indicator
  const refreshMutation = api.metric.refreshMetricValue.useMutation({
    onMutate: async ({ id }) => {
      // Cancel outgoing refetches
      await utils.metric.getAll.cancel();

      // Snapshot previous data
      const previousMetrics = utils.metric.getAll.getData();

      return { previousMetrics, refreshingId: id };
    },
    onError: (error, _variables, context) => {
      // Revert on error if needed
      if (context?.previousMetrics) {
        utils.metric.getAll.setData(undefined, context.previousMetrics);
      }
      setRefreshingMetricId(null);
      setStatus(`Error refreshing metric: ${error.message}`);
    },
    onSuccess: (refreshedMetric) => {
      // Update the metric with fresh value from server
      utils.metric.getAll.setData(undefined, (old) =>
        old?.map((m) => (m.id === refreshedMetric.id ? refreshedMetric : m)),
      );
      setRefreshingMetricId(null);
      setStatus("Metric refreshed successfully!");
    },
  });

  const handleCreateManual = () => {
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
    // Dialog close and form reset handled in onMutate for instant feedback
  };

  // Helper to handle metric creation from integration creators
  const handleMetricCreated = () => {
    // Invalidate to ensure fresh data from server
    void utils.metric.getAll.invalidate();
    setStatus("Metric created successfully!");
  };

  const handleEdit = (metric: NonNullable<typeof metrics>[0]) => {
    setEditingMetricId(metric.id);
    setFormData({
      name: metric.name,
      description: metric.description ?? "",
      type: metric.type as MetricType,
      targetValue: metric.targetValue?.toString() ?? "",
      unit: metric.unit ?? "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!editingMetricId) return;

    const targetValue = formData.targetValue
      ? parseFloat(formData.targetValue)
      : undefined;

    updateMutation.mutate({
      id: editingMetricId,
      name: formData.name,
      description: formData.description || undefined,
      targetValue,
      unit: formData.unit || undefined,
    });
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Delete metric",
      description: `Are you sure you want to delete "${name}"? This will permanently remove the metric and all its data. This action cannot be undone.`,
      confirmText: "Delete",
      variant: "destructive",
    });

    if (confirmed) {
      setDeletingMetricId(id);
      deleteMutation.mutate({ id });
    }
  };

  const handleRefresh = (id: string) => {
    setRefreshingMetricId(id);
    refreshMutation.mutate({ id });
  };

  // Filter metrics by integration
  const getMetricsForIntegration = (connectionId: string) => {
    return metrics?.filter((m) => m.integrationId === connectionId) ?? [];
  };

  return (
    <>
      {status && (
        <Alert>
          <AlertDescription>{status}</AlertDescription>
        </Alert>
      )}

      {/* Integration Tabs */}
      <Tabs
        value={selectedTab}
        onValueChange={setSelectedTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5">
          <TabsTrigger value="all">
            All Metrics
            {metrics && <Badge className="ml-2">{metrics.length}</Badge>}
          </TabsTrigger>
          {activeIntegrations.map((integration) => (
            <TabsTrigger
              key={integration.connectionId}
              value={integration.connectionId}
              className="capitalize"
            >
              {integration.integrationId}
              <Badge className="ml-2">
                {getMetricsForIntegration(integration.connectionId).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All Metrics Tab */}
        <TabsContent value="all" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">All Metrics</h2>
            <Button onClick={() => setIsCreateManualDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Manual Metric
            </Button>
          </div>

          {metrics && metrics.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <IntegrationMetricCard
                  key={metric.id}
                  metric={metric}
                  onRefresh={handleRefresh}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isRefreshing={refreshingMetricId === metric.id}
                  isDeleting={deletingMetricId === metric.id}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-muted-foreground flex min-h-[200px] items-center justify-center text-center">
                <div className="space-y-3">
                  <p className="text-lg">No metrics yet</p>
                  <p className="text-sm">
                    Create your first metric to start tracking KPIs
                  </p>
                  <Button onClick={() => setIsCreateManualDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Metric
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Integration Tabs */}
        {activeIntegrations.map((integration) => {
          const integrationMetrics = getMetricsForIntegration(
            integration.connectionId,
          );

          return (
            <TabsContent
              key={integration.connectionId}
              value={integration.connectionId}
              className="space-y-6"
            >
              <div>
                <h2 className="text-2xl font-semibold capitalize">
                  {integration.integrationId} Metrics
                </h2>
                <p className="text-muted-foreground mt-1">
                  Create and manage metrics from your{" "}
                  {integration.integrationId} integration
                </p>
              </div>

              {/* Dynamic Metric Creator - works for all integrations */}
              <DynamicMetricCreator
                connectionId={integration.connectionId}
                integrationId={integration.integrationId}
                onSuccess={handleMetricCreated}
              />

              {/* Existing Metrics */}
              {integrationMetrics.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Existing Metrics</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {integrationMetrics.map((metric) => (
                      <IntegrationMetricCard
                        key={metric.id}
                        metric={metric}
                        onRefresh={handleRefresh}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        isRefreshing={refreshingMetricId === metric.id}
                        isDeleting={deletingMetricId === metric.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Create Manual Metric Dialog */}
      <Dialog
        open={isCreateManualDialogOpen}
        onOpenChange={setIsCreateManualDialogOpen}
      >
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
                setIsCreateManualDialogOpen(false);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateManual}
              disabled={!formData.name || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Metric"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
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
                setIsEditDialogOpen(false);
                setEditingMetricId(null);
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
    </>
  );
}
