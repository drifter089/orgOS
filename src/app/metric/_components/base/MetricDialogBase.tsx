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
    displayName?: string | null;
    createdAt: Date;
  };
  onSubmit: (data: MetricCreateInput) => void | Promise<void>;
  isCreating: boolean;
  error: string | null;
}

interface MetricDialogBaseProps {
  integrationId: string;
  connectionId?: string;
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

export function MetricDialogBase({
  integrationId,
  connectionId: connectionIdProp,
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

  const integrationQuery = api.integration.listWithStats.useQuery();
  // If connectionId is provided, find by connectionId; otherwise fall back to integrationId
  const connection = integrationQuery.data?.active.find((int) =>
    connectionIdProp
      ? int.connectionId === connectionIdProp
      : int.integrationId === integrationId,
  );

  // Single mutation - creates metric + dashboard metric in transaction
  const createMutation = api.metric.create.useMutation();

  /**
   * TODO: Chart generation will be implemented as part of METRICS_ARCHITECTURE_PLAN.md
   *
   * The new flow will:
   * 1. Use saved MetricTransformer to transform raw API data into DataPoints
   * 2. Use saved ChartTransformer to convert DataPoints into chart configuration
   *
   * For now, metrics are created without chart data.
   * Users can regenerate charts from the Settings tab once the architecture is implemented.
   */

  const handleSubmit = async (data: MetricCreateInput) => {
    setError(null);
    const tempId = `temp-${Date.now()}`;

    // Build optimistic dashboard metric (no chart data - will be generated later)
    const optimisticDashboardMetric: DashboardMetricWithRelations = {
      id: tempId,
      organizationId: "",
      metricId: tempId,
      graphType: "bar",
      graphConfig: {} as Prisma.JsonValue,
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
              displayName: connection.displayName ?? null,
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

    // Optimistic update - add to dashboard cache immediately
    utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
      old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
    );
    if (teamId) {
      utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
        old ? [...old, optimisticDashboardMetric] : [optimisticDashboardMetric],
      );
    }

    // Optimistic update - add to metric tabs cache (metric.getByTeamId)
    if (teamId) {
      utils.metric.getByTeamId.setData({ teamId }, (old) =>
        old
          ? [...old, optimisticDashboardMetric.metric]
          : [optimisticDashboardMetric.metric],
      );
    }

    // Show optimistic toast
    toast.success("KPI added", {
      description:
        "Chart generation will be available after architecture update.",
    });

    // Close dialog immediately (optimistic update makes it feel instant)
    setOpen?.(false);
    onSuccess?.();

    try {
      // Create the metric (chart generation will be implemented in new architecture)
      const realDashboardMetric = await createMutation.mutateAsync({
        ...data,
        teamId,
      });

      // Swap temp→real ID in dashboard cache
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
        );
        // Swap temp→real ID in metric tabs cache
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.map((m) => (m.id === tempId ? realDashboardMetric.metric : m)),
        );
      }
    } catch {
      // Metric creation failed - rollback all caches
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.filter((dm) => dm.id !== tempId),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.filter((dm) => dm.id !== tempId),
        );
        utils.metric.getByTeamId.setData({ teamId }, (old) =>
          old?.filter((m) => m.id !== tempId),
        );
      }
      toast.error("Failed to create KPI");
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
          isCreating: createMutation.isPending,
          error,
        })}

        {error && <p className="text-destructive text-sm">Error: {error}</p>}
      </DialogContent>
    </Dialog>
  );
}
