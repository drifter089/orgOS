"use client";

import { useState } from "react";

import { Pencil, Plus, Trash2, TrendingUp } from "lucide-react";

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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/trpc/react";

import { MetricDialog } from "../_components/metric-dialog";

const FREQUENCY_LABELS: Record<string, string> = {
  REAL_TIME: "Real-time",
  DAILY: "Daily",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

const TYPE_COLORS: Record<string, string> = {
  percentage: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  number: "bg-green-500/10 text-green-700 dark:text-green-400",
  duration: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  rate: "bg-red-500/10 text-red-700 dark:text-red-400",
};

export default function MetricsPage() {
  const [editingMetricId, setEditingMetricId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const { data: metrics = [], isLoading } = api.metric.getAll.useQuery();
  const utils = api.useUtils();

  const deleteMetric = api.metric.delete.useMutation({
    onSuccess: () => {
      void utils.metric.getAll.invalidate();
    },
    onError: (error) => {
      alert(error.message);
    },
  });

  return (
    <div className="container mx-auto max-w-7xl space-y-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Metrics</h1>
          <p className="text-muted-foreground mt-2">
            Manage KPI metrics for your organization
          </p>
        </div>
        <MetricDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          trigger={
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Metric
            </Button>
          }
        />
      </div>

      {/* Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            All Metrics
          </CardTitle>
          <CardDescription>
            {metrics.length} metric{metrics.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-muted-foreground py-8 text-center">
              Loading metrics...
            </div>
          ) : metrics.length === 0 ? (
            <div className="text-muted-foreground py-12 text-center">
              <TrendingUp className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">No metrics yet</p>
              <p className="mt-2 text-sm">
                Create your first metric to start tracking KPIs
              </p>
              <MetricDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                trigger={
                  <Button className="mt-4" variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Metric
                  </Button>
                }
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Current / Target</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {metrics.map((metric) => (
                  <TableRow key={metric.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{metric.name}</div>
                        {metric.description && (
                          <div className="text-muted-foreground text-xs">
                            {metric.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={TYPE_COLORS[metric.type] ?? ""}
                      >
                        {metric.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        {metric.currentValue !== null && (
                          <span className="font-medium">
                            {metric.currentValue.toFixed(1)}
                            {metric.unit}
                          </span>
                        )}
                        {metric.targetValue !== null && (
                          <>
                            <span className="text-muted-foreground">/</span>
                            <span className="text-muted-foreground">
                              {metric.targetValue.toFixed(1)}
                              {metric.unit}
                            </span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {metric.category ? (
                        <Badge variant="outline" className="text-xs">
                          {metric.category}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">
                        {FREQUENCY_LABELS[metric.collectionFrequency] ??
                          metric.collectionFrequency}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-xs">
                        {metric.dataSource ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingMetricId(metric.id)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (
                              confirm(
                                `Delete metric "${metric.name}"? This cannot be undone.`,
                              )
                            ) {
                              deleteMetric.mutate({ id: metric.id });
                            }
                          }}
                          disabled={deleteMetric.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editingMetricId && (
        <MetricDialog
          metricId={editingMetricId}
          open={!!editingMetricId}
          onOpenChange={(open) => !open && setEditingMetricId(null)}
        />
      )}
    </div>
  );
}
