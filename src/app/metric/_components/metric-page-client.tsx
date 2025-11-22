"use client";

import { useState } from "react";

import dynamic from "next/dynamic";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useConfirmation } from "@/providers/ConfirmationDialogProvider";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

// Dynamically import integration pages
const GitHubPage = dynamic(() => import("../github/page"), { ssr: false });
const PostHogPage = dynamic(() => import("../posthog/page"), { ssr: false });
const GoogleSheetsPage = dynamic(() => import("../google-sheets/page"), {
  ssr: false,
});
const YouTubePage = dynamic(() => import("../youtube/page"), { ssr: false });

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
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [status, setStatus] = useState<string>("");
  const [selectedTab, setSelectedTab] = useState<string>("all");
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
      await utils.metric.getAll.cancel();
      const previousMetrics = utils.metric.getAll.getData();

      if (previousMetrics) {
        utils.metric.getAll.setData(
          undefined,
          previousMetrics.filter((m) => m.id !== id),
        );
      }

      return { previousMetrics, deletedId: id };
    },
    onError: (error, _variables, context) => {
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
      await utils.metric.getAll.invalidate();
    },
  });

  // Update mutation
  const updateMutation = api.metric.update.useMutation({
    onSuccess: () => {
      setStatus("Metric updated successfully!");
      setIsEditDialogOpen(false);
      void utils.metric.getAll.invalidate();
    },
    onError: (error) => {
      setStatus(`Error updating metric: ${error.message}`);
    },
  });

  const handleEdit = (metric: Metrics[0]) => {
    setEditingMetric(metric);
    setEditName(metric.name);
    setEditDescription(metric.description ?? "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingMetric) return;

    updateMutation.mutate({
      id: editingMetric.id,
      name: editName,
      description: editDescription || undefined,
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

  // Filter metrics by integration
  const getMetricsForIntegration = (connectionId: string) => {
    return metrics?.filter((m) => m.integrationId === connectionId) ?? [];
  };

  // Map integration ID to page component
  const getIntegrationPage = (integrationId: string) => {
    switch (integrationId) {
      case "github":
        return <GitHubPage />;
      case "posthog":
        return <PostHogPage />;
      case "google-sheet":
        return <GoogleSheetsPage />;
      case "youtube":
        return <YouTubePage />;
      default:
        return null;
    }
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
                <Card key={metric.id}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.name}
                    </CardTitle>
                    <Badge variant="outline" className="capitalize">
                      {metric.integrationId}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-muted-foreground text-xs">
                      Template: {metric.metricTemplate}
                    </p>
                    {metric.description && (
                      <p className="text-muted-foreground text-sm">
                        {metric.description}
                      </p>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(metric)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(metric.id, metric.name)}
                        disabled={deletingMetricId === metric.id}
                      >
                        {deletingMetricId === metric.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
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

              {/* Integration-specific page */}
              {getIntegrationPage(integration.integrationId)}

              {/* Existing Metrics */}
              {integrationMetrics.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Existing Metrics</h3>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {integrationMetrics.map((metric) => (
                      <Card key={metric.id}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">
                            {metric.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-muted-foreground text-xs">
                            Template: {metric.metricTemplate}
                          </p>
                          {metric.description && (
                            <p className="text-muted-foreground text-sm">
                              {metric.description}
                            </p>
                          )}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEdit(metric)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() =>
                                handleDelete(metric.id, metric.name)
                              }
                              disabled={deletingMetricId === metric.id}
                            >
                              {deletingMetricId === metric.id
                                ? "Deleting..."
                                : "Delete"}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Metric</DialogTitle>
            <DialogDescription>
              Update the name and description of your metric
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (optional)</Label>
              <Input
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={!editName || updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
