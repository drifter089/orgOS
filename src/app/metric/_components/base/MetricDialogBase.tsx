"use client";

import { useState } from "react";

import { toast } from "sonner";

import { GoalSetupStep } from "@/components/metric/goal-setup-step";
import { PipelineProgressDisplay } from "@/components/pipeline-progress-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useMetricMutations } from "@/hooks/use-metric-mutations";
import { usePipelineStatus } from "@/hooks/use-pipeline-status";
import { cn } from "@/lib/utils";
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

type DialogStep = "form" | "processing" | "goal";

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
  const [pipelineMetricId, setPipelineMetricId] = useState<string | null>(null);

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
      setPipelineMetricId(null);
    }
  };

  const { create: createMutation } = useMetricMutations({ teamId });
  const utils = api.useUtils();

  // Track pipeline progress with completion/error callbacks
  // Single source of truth - also used for display via PipelineProgressDisplay
  const pipelineStatus = usePipelineStatus({
    metricId: pipelineMetricId,
    enabled: !!pipelineMetricId,
    onComplete: () => {
      void utils.dashboard.getDashboardCharts.invalidate();
      setStep("goal");
    },
    onError: (error) => {
      void utils.dashboard.getDashboardCharts.invalidate();
      toast.error("KPI creation failed", { description: error });
      setStep("form");
      setPipelineMetricId(null);
    },
  });

  const pipelineError = pipelineStatus.error;

  const integrationQuery = api.integration.listWithStats.useQuery();
  const connection = integrationQuery.data?.active.find((int) =>
    connectionIdProp
      ? int.connectionId === connectionIdProp
      : int.providerId === integrationId,
  );

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

    try {
      // Create the metric with optimistic update (handled by hook)
      const realDashboardChart = await createMutation.mutateAsync({
        ...data,
        teamId,
      });

      // Store metric info for goal setup after pipeline completes
      setCreatedMetricId(realDashboardChart.metric.id);
      setCreatedMetricName(data.name);

      // Start watching the pipeline progress
      setPipelineMetricId(realDashboardChart.metric.id);
      setStep("processing");
    } catch {
      // Error handling and rollback handled by hook
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
        ) : step === "processing" ? (
          <>
            <DialogHeader>
              <DialogTitle>Creating KPI</DialogTitle>
              <DialogDescription>
                Setting up your metric and generating the chart...
              </DialogDescription>
            </DialogHeader>

            <div className="py-8">
              {pipelineMetricId && pipelineStatus.isProcessing && (
                <PipelineProgressDisplay
                  pipelineStatus={pipelineStatus}
                  variant="drawer"
                />
              )}
            </div>

            {pipelineError && (
              <p className="text-destructive text-sm">Error: {pipelineError}</p>
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
