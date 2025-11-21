"use client";

import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

import { MetricCard } from "./cards/metric-card";
import { EditMetricDialog } from "./dialogs/edit-metric-dialog";
import { TemplateMetricForm } from "./forms/template-metric-form";

// Infer types from tRPC router
type Metrics = RouterOutputs["metric"]["getAll"];
type IntegrationsWithStats = RouterOutputs["integration"]["listWithStats"];

interface MetricPageClientProps {
  initialMetrics: Metrics;
  initialIntegrations: IntegrationsWithStats;
}

export function MetricPageClient({
  initialMetrics,
  initialIntegrations,
}: MetricPageClientProps) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMetric, setEditingMetric] = useState<Metrics[0] | null>(null);
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

  const handleMetricCreated = () => {
    void utils.metric.getAll.invalidate();
    setStatus("Metric created successfully!");
  };

  const handleMetricUpdated = () => {
    setStatus("Metric updated successfully!");
  };

  const handleEdit = (metric: Metrics[0]) => {
    setEditingMetric(metric);
    setIsEditDialogOpen(true);
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
          </div>

          {metrics && metrics.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {metrics.map((metric) => (
                <MetricCard
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
                    Connect an integration and create metrics from templates
                  </p>
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

              {/* Template Metric Form */}
              <TemplateMetricForm
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
                      <MetricCard
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

      {/* Dialogs */}
      <EditMetricDialog
        metric={editingMetric}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleMetricUpdated}
      />
    </>
  );
}
