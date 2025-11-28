"use client";

import { useState } from "react";

import type { Prisma } from "@prisma/client";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { ChartTransformResult } from "@/server/api/services/chart-tools/types";
import {
  createTransformKey,
  useMetricTransformStore,
} from "@/stores/metric-transform-store";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

export interface MetricCreateInput {
  templateId: string;
  connectionId: string;
  name: string;
  description: string;
  endpointParams: Record<string, string>;
  teamId?: string;
}

export interface ContentProps {
  connection: {
    id: string;
    connectionId: string;
    integrationId: string;
    createdAt: Date;
  };
  onSubmit: (data: MetricCreateInput) => void;
  isCreating: boolean;
  error: string | null;
}

interface MetricDialogBaseProps {
  integrationId: string;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
  maxWidth?: string;
  teamId?: string;
  children: (props: ContentProps) => React.ReactNode;
}

type DashboardMetricWithRelations =
  RouterOutputs["dashboard"]["getDashboardMetrics"][number];

/**
 * Validates that an object has the expected shape for ChartTransformResult
 */
function validateChartData(data: unknown): ChartTransformResult | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const obj = data as Record<string, unknown>;

  const hasRequiredFields =
    typeof obj.chartType === "string" &&
    Array.isArray(obj.chartData) &&
    typeof obj.chartConfig === "object" &&
    obj.chartConfig !== null &&
    typeof obj.xAxisKey === "string" &&
    Array.isArray(obj.dataKeys) &&
    typeof obj.title === "string";

  if (!hasRequiredFields) {
    return null;
  }

  return obj as unknown as ChartTransformResult;
}

export function MetricDialogBase({
  integrationId,
  title,
  description,
  trigger,
  open: controlledOpen,
  onOpenChange,
  onSuccess,
  maxWidth = "sm:max-w-[600px]",
  teamId,
  children,
}: MetricDialogBaseProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const utils = api.useUtils();
  const transformStore = useMetricTransformStore();

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === integrationId,
  );

  // Single mutation - creates metric + dashboard metric in transaction
  const createMutation = api.metric.create.useMutation();

  // For saving chart data after creation
  const updateChartMutation =
    api.dashboard.updateDashboardMetricChart.useMutation();

  const handleSubmit = (data: MetricCreateInput) => {
    setError(null);

    // Get chartData from Zustand store if available
    const transformKey = createTransformKey({
      connectionId: data.connectionId,
      templateId: data.templateId,
      endpointParams: data.endpointParams,
    });
    const transform = transformStore.getTransform(transformKey);
    const chartData = transform?.chartData
      ? validateChartData(transform.chartData)
      : null;

    const tempId = `temp-${Date.now()}`;

    // Build optimistic dashboard metric
    const optimisticDashboardMetric: DashboardMetricWithRelations = {
      id: tempId,
      organizationId: "",
      metricId: tempId,
      graphType: chartData?.chartType ?? "bar",
      graphConfig: (chartData ?? {}) as Prisma.JsonValue,
      position: 9999,
      size: "medium",
      createdAt: new Date(),
      updatedAt: new Date(),
      metric: {
        id: tempId,
        name: data.name,
        description: data.description ?? null,
        organizationId: "",
        integrationId: data.connectionId,
        metricTemplate: data.templateId,
        endpointConfig: data.endpointParams,
        teamId: teamId ?? null,
        lastFetchedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: connection
          ? {
              id: connection.id,
              connectionId: connection.connectionId,
              integrationId: connection.integrationId,
              organizationId: "",
              connectedBy: "",
              status: "active",
              metadata: null,
              lastSyncAt: null,
              errorMessage: null,
              createdAt: connection.createdAt,
              updatedAt: connection.createdAt,
            }
          : null,
        roles: [],
      },
    };

    // Optimistic update - add to cache immediately
    utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
      old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
    );
    if (teamId) {
      utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
        old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
      );
    }

    // Close dialog and notify parent immediately (optimistic update makes it feel instant)
    setOpen?.(false);
    onSuccess?.();

    // Use mutateAsync so we can handle the result after dialog closes
    // The callbacks are captured in the promise chain, not component lifecycle
    createMutation
      .mutateAsync({ ...data, teamId })
      .then((realDashboardMetric) => {
        // Replace temp with real in cache
        utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
          old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
        );
        if (teamId) {
          utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
            old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
          );
        }

        // If we have chartData from store, save it to the real dashboard metric
        if (chartData) {
          updateChartMutation.mutate({
            dashboardMetricId: realDashboardMetric.id,
            graphType: chartData.chartType,
            graphConfig: chartData as unknown as Record<string, unknown>,
          });
        }
      })
      .catch(() => {
        // Rollback from cache
        utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
          old?.filter((dm) => dm.id !== tempId),
        );
        if (teamId) {
          utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
            old?.filter((dm) => dm.id !== tempId),
          );
        }
        toast.error("Failed to create metric");
      });

    // Clear transform store for this key
    transformStore.reset(transformKey);
  };

  if (!connection) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>No {integrationId} Connection</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Please connect your {integrationId} account first.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn("max-h-[90vh] overflow-y-auto", maxWidth)}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        {children({
          connection,
          onSubmit: handleSubmit,
          isCreating: createMutation.isPending,
          error,
        })}

        {error && <p className="text-destructive text-sm">Error: {error}</p>}
      </DialogContent>
    </Dialog>
  );
}
