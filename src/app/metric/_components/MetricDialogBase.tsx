"use client";

import { useCallback, useRef, useState } from "react";

import type { Prisma } from "@prisma/client";
import { toast } from "sonner";

import type { ChartTransformResult } from "@/app/dashboard/[teamId]/_components/dashboard-metric-card";
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

export interface PrefetchState {
  rawData?: unknown;
  chartData?: ChartTransformResult | null;
}

export interface ContentProps {
  connection: {
    id: string;
    connectionId: string;
    integrationId: string;
    createdAt: Date;
  };
  onSubmit: (data: MetricCreateInput, prefetchState?: PrefetchState) => void;
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

const MAX_RETRIES = 3;

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

  // Track background operations
  const backgroundOpRef = useRef<{
    tempMetricId: string;
    tempDashboardMetricId: string;
  } | null>(null);

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === integrationId,
  );

  // Combined mutation - creates both metric AND dashboard metric in one transaction
  const createMetricWithDashboardMutation =
    api.dashboard.createMetricWithDashboard.useMutation();

  // Background creation with retry logic - SINGLE call for both metric and dashboard metric
  const createInBackground = useCallback(
    async (
      data: MetricCreateInput,
      prefetchState: PrefetchState | undefined,
      tempMetricId: string,
      tempDashboardMetricId: string,
    ) => {
      // If chartData available, use it. Otherwise mark as processing so card doesn't auto-refresh
      const graphConfigToSave = prefetchState?.chartData
        ? (prefetchState.chartData as unknown as Record<string, unknown>)
        : { _processing: true };

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Single call creates both metric AND dashboard metric
          const dashboardMetric =
            await createMetricWithDashboardMutation.mutateAsync({
              ...data,
              teamId,
              graphType: prefetchState?.chartData?.chartType ?? "bar",
              graphConfig: graphConfigToSave,
            });

          // Update metric cache with real metric
          const realMetric = dashboardMetric.metric;
          utils.metric.getAll.setData(undefined, (old) =>
            old?.map((m) => (m.id === tempMetricId ? realMetric : m)),
          );
          if (teamId) {
            utils.metric.getByTeamId.setData({ teamId }, (old) =>
              old?.map((m) => (m.id === tempMetricId ? realMetric : m)),
            );
          }

          // Update dashboard cache with real dashboard metric
          utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
            old?.map((dm) =>
              dm.id === tempDashboardMetricId ? dashboardMetric : dm,
            ),
          );
          if (teamId) {
            utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
              old?.map((dm) =>
                dm.id === tempDashboardMetricId ? dashboardMetric : dm,
              ),
            );
          }

          backgroundOpRef.current = null;
          return; // Success!
        } catch (err) {
          if (attempt === MAX_RETRIES) {
            console.error("Failed to create metric after retries:", err);
            toast.error("Failed to save metric. It will sync on refresh.");

            // Rollback from cache
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
            backgroundOpRef.current = null;
            return;
          }
          await new Promise((r) => setTimeout(r, 1000 * attempt));
        }
      }
    },
    [createMetricWithDashboardMutation, utils, teamId],
  );

  const handleSubmit = (
    data: MetricCreateInput,
    prefetchState?: PrefetchState,
  ) => {
    setError(null);
    setIsProcessing(true);

    const tempMetricId = `temp-${Date.now()}`;
    const tempDashboardMetricId = `temp-dm-${Date.now()}`;

    backgroundOpRef.current = { tempMetricId, tempDashboardMetricId };

    // =========================================================================
    // Step 1: Optimistic updates - USE chartData if available!
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

    // Optimistic dashboard metric - include chartData if we have it!
    const optimisticDashboardMetric: DashboardMetricWithRelations = {
      id: tempDashboardMetricId,
      organizationId: "",
      metricId: tempMetricId,
      graphType: prefetchState?.chartData?.chartType ?? "bar",
      // If we have chartData, use it; otherwise mark as processing
      graphConfig: (prefetchState?.chartData
        ? prefetchState.chartData
        : { _processing: true }) as Prisma.JsonValue,
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
        old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
      );
    }

    // =========================================================================
    // Step 2: Close dialog IMMEDIATELY - chart renders with AI data if available!
    // =========================================================================
    setOpen?.(false);
    setIsProcessing(false);
    onSuccess?.();

    // =========================================================================
    // Step 3: Fire-and-forget DB operations with silent retry
    // =========================================================================
    void createInBackground(
      data,
      prefetchState,
      tempMetricId,
      tempDashboardMetricId,
    );
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
