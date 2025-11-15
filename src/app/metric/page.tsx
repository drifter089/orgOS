"use client";

import { useState } from "react";

import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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

import { IntegrationTester } from "./_components/integration-tester";

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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MetricFormData>(initialFormData);
  const [status, setStatus] = useState<string>("");

  const { data: metrics, isLoading, refetch } = api.metric.getAll.useQuery();

  const createMutation = api.metric.create.useMutation({
    onSuccess: () => {
      void refetch();
      setIsCreateDialogOpen(false);
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

  const generateMockDataMutation = api.metric.generateMockData.useMutation({
    onSuccess: () => {
      void refetch();
      setStatus("Mock data generated!");
    },
    onError: (error) => {
      setStatus(`Error generating mock data: ${error.message}`);
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

  const handleGenerateMockData = (id: string) => {
    generateMockDataMutation.mutate({ id });
  };

  const getMetricColor = (
    current: number | null,
    target: number | null,
    type: string,
  ): string => {
    if (!current || !target) return "text-gray-500";

    const percentage = (current / target) * 100;

    if (type === "duration") {
      // For duration, lower is better
      if (percentage <= 100) return "text-green-600";
      if (percentage <= 120) return "text-yellow-600";
      return "text-red-600";
    } else {
      // For other types, higher is better
      if (percentage >= 100) return "text-green-600";
      if (percentage >= 80) return "text-yellow-600";
      return "text-red-600";
    }
  };

  const formatValue = (
    value: number | null,
    type: string,
    unit?: string | null,
  ): string => {
    if (value === null) return "N/A";

    const formatted = value.toFixed(2);

    if (type === "percentage") {
      return `${formatted}%`;
    }

    if (unit) {
      return `${formatted} ${unit}`;
    }

    return formatted;
  };

  return (
    <div className="container mx-auto max-w-6xl space-y-6 p-8">
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

      <Tabs defaultValue="metrics" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="testing">Integration Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="metrics" className="space-y-6">
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Create Metric
            </Button>
          </div>

          {/* Metrics Grid */}
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
                <Card key={metric.id} className="relative">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{metric.name}</CardTitle>
                        <CardDescription className="mt-1">
                          {metric.description ?? "No description"}
                        </CardDescription>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {metric.type}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-muted-foreground text-sm">
                          Current
                        </span>
                        <span
                          className={`text-2xl font-bold ${getMetricColor(metric.currentValue, metric.targetValue, metric.type)}`}
                        >
                          {formatValue(
                            metric.currentValue,
                            metric.type,
                            metric.unit,
                          )}
                        </span>
                      </div>
                      {metric.targetValue !== null && (
                        <div className="flex items-baseline justify-between">
                          <span className="text-muted-foreground text-sm">
                            Target
                          </span>
                          <span className="text-lg">
                            {formatValue(
                              metric.targetValue,
                              metric.type,
                              metric.unit,
                            )}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleGenerateMockData(metric.id)}
                        disabled={generateMockDataMutation.isPending}
                      >
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Generate Data
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(metric)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(metric.id, metric.name)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
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
                    Create your first metric to start tracking KPIs
                  </p>
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Metric
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <IntegrationTester />
        </TabsContent>
      </Tabs>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Metric</DialogTitle>
            <DialogDescription>
              Define a new metric to track for your organization
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
                setIsCreateDialogOpen(false);
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
