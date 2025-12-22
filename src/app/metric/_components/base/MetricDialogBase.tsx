"use client";

import { useState } from "react";

import type { Prisma } from "@prisma/client";
import { toast } from "sonner";

import { GoalSetupStep } from "@/components/metric/goal-setup-step";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useOptimisticMetricUpdate } from "@/hooks/use-optimistic-metric-update";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

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
    providerId: string;
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

type DialogStep = "form" | "goal";

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
  const [step, setStep] = useState<DialogStep>("form");
  const [createdMetricId, setCreatedMetricId] = useState<string | null>(null);
  const [createdMetricName, setCreatedMetricName] = useState<string>("");

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = (value: boolean | undefined) => {
    if (isControlled) {
      onOpenChange?.(value ?? false);
    } else {
      setInternalOpen(value ?? false);
    }
    // Reset state when closing
    if (!value) {
      setStep("form");
      setCreatedMetricId(null);
      setCreatedMetricName("");
    }
  };

  const { cancelQueries, addOptimisticChart, swapTempWithReal, rollback } =
    useOptimisticMetricUpdate({ teamId });

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find((int) =>
    connectionIdProp
      ? int.connectionId === connectionIdProp
      : int.providerId === integrationId,
  );

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

    // Build optimistic dashboard chart (no chart data - will be generated later)
    const optimisticDashboardChart: DashboardChartWithRelations = {
      id: tempId,
      organizationId: "",
      metricId: tempId,
      chartType: "bar",
      chartConfig: {} as Prisma.JsonValue,
      position: 9999,
      size: "medium",
      chartTransformerId: null,
      chartTransformer: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      metric: {
        id: tempId,
        name: data.name,
        description: data.description ?? null,
        organizationId: "",
        integrationId: data.connectionId,
        templateId: data.templateId,
        endpointConfig: data.endpointParams,
        teamId: teamId ?? null,
        lastFetchedAt: null,
        pollFrequency: "daily",
        nextPollAt: null,
        lastError: null,
        refreshStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: connection
          ? {
              id: connection.id,
              connectionId: connection.connectionId,
              providerId: connection.providerId,
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
        goal: null,
      },
      goalProgress: null,
      valueLabel: null, // Will be populated after transformer is created
      dataDescription: null, // Will be populated after transformer is created
    };

    await cancelQueries();
    addOptimisticChart(optimisticDashboardChart);

    try {
      // Create the metric (chart generation will be implemented in new architecture)
      const realDashboardChart = await createMutation.mutateAsync({
        ...data,
        teamId,
      });

      const realDashboardChartWithGoal: DashboardChartWithRelations = {
        ...realDashboardChart,
        metric: { ...realDashboardChart.metric, goal: null },
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
      };

      swapTempWithReal(tempId, realDashboardChartWithGoal);

      toast.success("KPI created", {
        description: "You can now set a goal for this metric.",
      });

      setCreatedMetricId(realDashboardChart.metric.id);
      setCreatedMetricName(data.name);
      setStep("goal");
    } catch {
      rollback(tempId);
      toast.error("Failed to create KPI");
    }
  };

  const handleFinish = () => {
    setOpen(false);
    onSuccess?.();
  };

  const handleSkipGoal = () => {
    setOpen(false);
    onSuccess?.();
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
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </DialogHeader>

            {children({
              connection,
              onSubmit: handleSubmit,
              isCreating: createMutation.isPending,
              error,
            })}

            {error && (
              <p className="text-destructive text-sm">Error: {error}</p>
            )}
          </>
        ) : (
          createdMetricId && (
            <GoalSetupStep
              metricId={createdMetricId}
              metricName={createdMetricName}
              teamId={teamId}
              onBack={() => setStep("form")}
              onSkip={handleSkipGoal}
              onFinish={handleFinish}
              useDialogHeader={true}
            />
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
