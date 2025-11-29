"use client";

import { useState } from "react";

import type { Prisma } from "@prisma/client";
import { toast } from "sonner";

import { getTemplate } from "@/app/metric/registry";
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
  onSubmit: (data: MetricCreateInput) => void | Promise<void>;
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

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find(
    (int) => int.integrationId === integrationId,
  );

  // Single mutation - creates metric + dashboard metric in transaction
  const createMutation = api.metric.create.useMutation();

  // For saving chart data after creation
  const updateChartMutation =
    api.dashboard.updateDashboardMetricChart.useMutation();

  // For AI transformation
  const transformMutation = api.dashboard.transformChartWithAI.useMutation();

  /**
   * Generate chart data by fetching API data and transforming with AI.
   * This runs in parallel with metric creation.
   */
  async function generateChartData(params: {
    connectionId: string;
    integrationId: string;
    templateId: string;
    endpointParams: Record<string, string>;
    metricName: string;
    metricDescription?: string;
  }): Promise<ChartTransformResult> {
    const template = getTemplate(params.templateId);
    if (!template) {
      throw new Error("Template not found");
    }

    // Build endpoint
    let endpoint = template.metricEndpoint;
    for (const [key, value] of Object.entries(params.endpointParams)) {
      endpoint = endpoint.replace(`{${key}}`, encodeURIComponent(value));
    }

    // Build body if needed
    let body: unknown = undefined;
    if (template.requestBody) {
      let bodyStr = JSON.stringify(template.requestBody);
      for (const [key, value] of Object.entries(params.endpointParams)) {
        bodyStr = bodyStr.replace(new RegExp(`\\{${key}\\}`, "g"), value);
      }
      body = JSON.parse(bodyStr);
    }

    // 1. Fetch raw API data
    const rawData = await utils.metric.fetchIntegrationData.fetch({
      connectionId: params.connectionId,
      integrationId: params.integrationId,
      endpoint,
      method: template.method,
      body,
    });

    if (!rawData?.data) {
      throw new Error("Failed to fetch integration data");
    }

    // Log raw data for debugging
    console.info("[Chart Generation] Raw API data:", {
      metricName: params.metricName,
      templateId: params.templateId,
      endpoint,
      dataType: typeof rawData.data,
      dataLength: Array.isArray(rawData.data)
        ? rawData.data.length
        : "not array",
      data: rawData.data,
    });

    // 2. Transform with AI
    const chartResult = await transformMutation.mutateAsync({
      metricConfig: {
        name: params.metricName,
        description: params.metricDescription,
        metricTemplate: params.templateId,
        endpointConfig: params.endpointParams,
      },
      rawData: rawData.data,
    });

    return chartResult;
  }

  const handleSubmit = async (data: MetricCreateInput) => {
    setError(null);
    const tempId = `temp-${Date.now()}`;

    // Build optimistic dashboard metric (no chart data yet - it will be generated)
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

    // Close dialog immediately (optimistic update makes it feel instant)
    setOpen?.(false);
    onSuccess?.();

    // Run metric creation and chart generation in PARALLEL
    const [metricResult, chartResult] = await Promise.allSettled([
      createMutation.mutateAsync({ ...data, teamId }),
      generateChartData({
        connectionId: data.connectionId,
        integrationId: connection?.integrationId ?? "",
        templateId: data.templateId,
        endpointParams: data.endpointParams,
        metricName: data.name,
        metricDescription: data.description,
      }),
    ]);

    // Handle results
    if (metricResult.status === "fulfilled") {
      const realDashboardMetric = metricResult.value;

      // Swap temp→real ID in cache
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.map((dm) => (dm.id === tempId ? realDashboardMetric : dm)),
        );
      }

      // If chart generation succeeded, save it
      if (chartResult.status === "fulfilled") {
        const chartData = chartResult.value;
        const updated = await updateChartMutation.mutateAsync({
          dashboardMetricId: realDashboardMetric.id,
          graphType: chartData.chartType,
          graphConfig: chartData as unknown as Record<string, unknown>,
        });

        // Update cache with chart data
        utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
          old?.map((dm) => (dm.id === updated.id ? updated : dm)),
        );
        if (teamId) {
          utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
            old?.map((dm) => (dm.id === updated.id ? updated : dm)),
          );
        }
      } else {
        // Chart generation failed - toast error, user can retry via Settings
        console.error("Chart generation failed:", chartResult.reason);
        toast.error(
          "Chart generation failed. You can retry from the Settings tab.",
        );
      }
    } else {
      // Metric creation failed - rollback
      utils.dashboard.getDashboardMetrics.setData(undefined, (old) =>
        old?.filter((dm) => dm.id !== tempId),
      );
      if (teamId) {
        utils.dashboard.getDashboardMetrics.setData({ teamId }, (old) =>
          old?.filter((dm) => dm.id !== tempId),
        );
      }
      toast.error("Failed to create metric");
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
