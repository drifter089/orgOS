"use client";

import { useState } from "react";

import { Plus } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { api } from "@/trpc/react";

import { IntegrationMetricCard } from "./_components/integration-metric-card";
import { GitHubMetricCreator } from "./github/github-metric-creator";
import { SheetsMetricCreator } from "./google-sheets/sheets-metric-creator";
import { PostHogMetricCreator } from "./posthog/posthog-metric-creator";
import { YouTubeMetricCreator } from "./youtube/youtube-metric-creator";

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

export default function MetricPage() {
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

  const { data: metrics, isLoading, refetch } = api.metric.getAll.useQuery();
  const { data: integrationsData } = api.integration.listWithStats.useQuery();
  const activeIntegrations = integrationsData?.active ?? [];

  const createMutation = api.metric.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateManualDialogOpen(false);
      setFormData(initialFormData);
      setStatus("Metric created successfully!");
    },
    onError: (error) => {
      setStatus(`Error creating metric: ${error.message}`);
    },
  });

  const updateMutation = api.metric.update.useMutation({
    onSuccess: () => {
      void refetch();
      setIsEditDialogOpen(false);
      setEditingMetricId(null);
      setFormData(initialFormData);
      setStatus("Metric updated successfully!");
    },
    onError: (error) => {
      setStatus(`Error updating metric: ${error.message}`);
    },
  });

  const deleteMutation = api.metric.delete.useMutation({
    onSuccess: () => {
      void refetch();
      setStatus("Metric deleted successfully!");
    },
    onError: (error) => {
      setStatus(`Error deleting metric: ${error.message}`);
    },
  });

  const refreshMutation = api.metric.refreshMetricValue.useMutation({
    onSuccess: () => {
      void refetch();
      setRefreshingMetricId(null);
      setStatus("Metric refreshed successfully!");
    },
    onError: (error) => {
      setRefreshingMetricId(null);
      setStatus(`Error refreshing metric: ${error.message}`);
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

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
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
    <div className="container mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Metrics</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage your organization&apos;s key performance indicators
          </p>
        </div>
      </div>

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

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="bg-muted h-6 w-32 animate-pulse rounded" />
                    <div className="bg-muted h-4 w-48 animate-pulse rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted h-12 w-24 animate-pulse rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : metrics && metrics.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <IntegrationMetricCard
                  key={metric.id}
                  metric={metric}
                  onRefresh={handleRefresh}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isRefreshing={refreshingMetricId === metric.id}
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

              {/* Integration-Specific Metric Creator */}
              {integration.integrationId === "github" && (
                <GitHubMetricCreator
                  connectionId={integration.connectionId}
                  onSuccess={() => {
                    void refetch();
                    setStatus("Metric created successfully!");
                  }}
                />
              )}
              {integration.integrationId === "google-sheet" && (
                <SheetsMetricCreator
                  connectionId={integration.connectionId}
                  onSuccess={() => {
                    void refetch();
                    setStatus("Metric created successfully!");
                  }}
                />
              )}
              {integration.integrationId === "posthog" && (
                <PostHogMetricCreator
                  connectionId={integration.connectionId}
                  onSuccess={() => {
                    void refetch();
                    setStatus("Metric created successfully!");
                  }}
                />
              )}
              {integration.integrationId === "youtube" && (
                <YouTubeMetricCreator
                  connectionId={integration.connectionId}
                  onSuccess={() => {
                    void refetch();
                    setStatus("Metric created successfully!");
                  }}
                />
              )}

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
    </div>
  );
}
