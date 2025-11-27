"use client";

import { useState } from "react";

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
  onSubmit: (
    data: MetricCreateInput,
    prefetchedRawData?: unknown,
  ) => void | Promise<void>;
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

type MetricWithIntegration = RouterOutputs["metric"]["getAll"][number];
type DashboardMetricWithRelations =
  RouterOutputs["dashboard"]["getDashboardMetrics"][number];

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
  const [isProcessing, setIsProcessing] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? onOpenChange : setInternalOpen;

  const utils = api.useUtils();

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === integrationId,
  );

  // Mutations
  const createMetricMutation = api.metric.create.useMutation();
  const createDashboardMetricMutation =
    api.dashboard.createDashboardMetric.useMutation();
  const transformAIMutation = api.dashboard.transformChartWithAI.useMutation();

  const handleSubmit = async (
    data: MetricCreateInput,
    prefetchedRawData?: unknown,
  ) => {
    setError(null);
    setIsProcessing(true);

    const tempMetricId = `temp-${Date.now()}`;
    const tempDashboardMetricId = `temp-dm-${Date.now()}`;

    try {
      // =========================================================================
      // Step 1: Optimistic updates for both metric and dashboard
      // =========================================================================

      // Optimistic metric
      const optimisticMetric: MetricWithIntegration = {
        id: tempMetricId,
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
      };

      // Optimistic dashboard metric - mark as "processing" with a special graphConfig
      const optimisticDashboardMetric: DashboardMetricWithRelations = {
        id: tempDashboardMetricId,
        organizationId: "",
        metricId: tempMetricId,
        graphType: "bar",
        graphConfig: { _processing: true }, // Special flag to prevent autoTrigger
        position: 9999,
        size: "medium",
        createdAt: new Date(),
        updatedAt: new Date(),
        metric: {
          ...optimisticMetric,
          roles: [],
        },
      };

      // Update metric cache
      utils.metric.getAll.setData(undefined, (old) =>
        old ? [...old, optimisticMetric] : [optimisticMetric],
      );
      if (teamId) {
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old ? [...old, optimisticMetric] : [optimisticMetric],
        );
      }

      // Update dashboard cache
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old
            ? [...old, optimisticDashboardMetric]
            : [optimisticDashboardMetric],
        );
      }

      // Close dialog immediately - user sees optimistic card
      setOpen?.(false);

      // =========================================================================
      // Step 2: Parallel - create metric + AI transform (wait for both)
      // =========================================================================

      // Start metric creation
      const metricPromise = createMetricMutation.mutateAsync({
        ...data,
        teamId,
      });

      // Start AI transform if we have prefetched data
      let chartData: RouterOutputs["dashboard"]["transformChartWithAI"] | null =
        null;
      if (prefetchedRawData) {
        try {
          chartData = await transformAIMutation.mutateAsync({
            metricConfig: {
              name: data.name,
              description: data.description,
              metricTemplate: data.templateId,
              endpointConfig: data.endpointParams,
            },
            rawData: prefetchedRawData,
          });
        } catch (aiError) {
          // AI failed - we'll create dashboard metric without chart data
          console.error("AI transformation failed:", aiError);
        }
      }

      // Wait for metric creation
      const createdMetric = await metricPromise;

      // Update metric cache with real data
      utils.metric.getAll.setData(undefined, (old) =>
        old?.map((m) => (m.id === tempMetricId ? createdMetric : m)),
      );
      if (teamId) {
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.map((m) => (m.id === tempMetricId ? createdMetric : m)),
        );
      }

      // =========================================================================
      // Step 3: Create dashboard metric WITH chart data (single call)
      // =========================================================================

      const createdDashboardMetric =
        await createDashboardMetricMutation.mutateAsync({
          metricId: createdMetric.id,
          graphType: chartData?.chartType ?? "bar",
          graphConfig: chartData
            ? (chartData as unknown as Record<string, unknown>)
            : {},
        });

      // Update dashboard cache with real dashboard metric (includes chart data)
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) =>
          dm.id === tempDashboardMetricId ? createdDashboardMetric : dm,
        ),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.map((dm) =>
            dm.id === tempDashboardMetricId ? createdDashboardMetric : dm,
          ),
        );
      }

      // Invalidate to ensure consistency
      void utils.metric.getAll.invalidate();
      void utils.dashboard.getDashboardMetrics.invalidate();
      if (teamId) {
        void utils.metric.getByTeamId.invalidate({ teamId });
        void utils.dashboard.getDashboardMetrics.invalidate({ teamId });
      }

      onSuccess?.();
    } catch (err) {
      // Rollback optimistic updates
      utils.metric.getAll.setData(undefined, (old) =>
        old?.filter((m) => m.id !== tempMetricId),
      );
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.filter((dm) => dm.id !== tempDashboardMetricId),
      );
      if (teamId) {
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.filter((m) => m.id !== tempMetricId),
        );
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.filter((dm) => dm.id !== tempDashboardMetricId),
        );
      }

      setError(err instanceof Error ? err.message : "Failed to create metric");
      // Re-open dialog on error
      setOpen?.(true);
    } finally {
      setIsProcessing(false);
    }
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
          isCreating: isProcessing,
          error,
        })}

        {error && <p className="text-destructive text-sm">Error: {error}</p>}
      </DialogContent>
    </Dialog>
  );
}
