"use client";

import { useState } from "react";

import type { Prisma } from "@prisma/client";
import { ArrowLeft, Check, Hash, Loader2, Percent, Target } from "lucide-react";
import { toast } from "sonner";

import { GoalEditor } from "@/components/metric/goal-editor";
import { RoleAssignment } from "@/components/metric/role-assignment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useOptimisticMetricUpdate } from "@/hooks/use-optimistic-metric-update";
import { cn } from "@/lib/utils";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";

type UnitType = "number" | "percentage";
type Cadence = "daily" | "weekly" | "monthly";
type DialogStep = "form" | "goal";

type DashboardChartWithRelations =
  RouterOutputs["dashboard"]["getDashboardCharts"][number];

interface ManualMetricContentProps {
  teamId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

const UNIT_OPTIONS: Array<{
  value: UnitType;
  label: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    value: "number",
    label: "Number",
    description: "Count or absolute value (e.g. 150 calls, $10k revenue)",
    icon: <Hash className="h-5 w-5" />,
  },
  {
    value: "percentage",
    label: "Percentage",
    description: "Rate or ratio (e.g. 85% satisfaction, 12% conversion)",
    icon: <Percent className="h-5 w-5" />,
  },
];

const CADENCE_OPTIONS: Array<{
  value: Cadence;
  label: string;
  description: string;
}> = [
  {
    value: "daily",
    label: "Daily",
    description: "Track day-over-day progress",
  },
  {
    value: "weekly",
    label: "Weekly",
    description: "Track week-over-week progress",
  },
  {
    value: "monthly",
    label: "Monthly",
    description: "Track month-over-month progress",
  },
];

export function ManualMetricContent({
  teamId,
  onSuccess,
  onClose,
}: ManualMetricContentProps) {
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [dialogStep, setDialogStep] = useState<DialogStep>("form");
  const [metricName, setMetricName] = useState("");
  const [unitType, setUnitType] = useState<UnitType | null>(null);
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [createdMetricId, setCreatedMetricId] = useState<string | null>(null);
  const [createdMetricName, setCreatedMetricName] = useState("");

  const { cancelQueries, addOptimisticChart, swapTempWithReal, rollback } =
    useOptimisticMetricUpdate({ teamId });

  const createMutation = api.metric.createManual.useMutation();

  const handleSubmit = async () => {
    if (!metricName.trim() || !unitType || !cadence) return;

    const tempId = `temp-${Date.now()}`;

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
        name: metricName.trim(),
        description: null,
        organizationId: "",
        integrationId: null,
        templateId: "manual",
        endpointConfig: { type: "manual", unitType, cadence },
        teamId: teamId,
        lastFetchedAt: null,
        pollFrequency: "manual",
        nextPollAt: null,
        lastError: null,
        refreshStatus: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        integration: null,
        roles: [],
        goal: null,
      },
      goalProgress: null,
      valueLabel: unitType === "percentage" ? "%" : null,
      dataDescription: null,
    };

    await cancelQueries();
    addOptimisticChart(optimisticDashboardChart);

    try {
      const realDashboardChart = await createMutation.mutateAsync({
        name: metricName.trim(),
        unitType,
        cadence,
        teamId,
      });

      const realDashboardChartWithGoal: DashboardChartWithRelations = {
        ...realDashboardChart,
        chartTransformer: null,
        metric: { ...realDashboardChart.metric, goal: null },
        goalProgress: null,
        valueLabel: unitType === "percentage" ? "%" : null,
        dataDescription: null,
      };

      swapTempWithReal(tempId, realDashboardChartWithGoal);

      toast.success("KPI created", {
        description: "You can now set a goal for this metric.",
      });

      setCreatedMetricId(realDashboardChart.metric.id);
      setCreatedMetricName(metricName.trim());
      setDialogStep("goal");
    } catch {
      rollback(tempId);
      toast.error("Failed to create KPI");
    }
  };

  const canProceed = () => {
    switch (formStep) {
      case 1:
        return metricName.trim().length > 0;
      case 2:
        return unitType !== null;
      case 3:
        return cadence !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (formStep === 1 && canProceed()) setFormStep(2);
    else if (formStep === 2 && canProceed()) setFormStep(3);
    else if (formStep === 3 && canProceed()) void handleSubmit();
  };

  const handleBack = () => {
    if (formStep === 2) setFormStep(1);
    else if (formStep === 3) setFormStep(2);
  };

  const handleFinish = () => {
    onClose?.();
    onSuccess?.();
  };

  const handleSkipGoal = () => {
    onClose?.();
    onSuccess?.();
  };

  if (dialogStep === "goal") {
    return (
      <div className="space-y-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Target className="text-primary h-5 w-5" />
            <h3 className="text-lg font-semibold">Set a Goal (Optional)</h3>
          </div>
          <p className="text-muted-foreground text-sm">
            Add a goal to track progress for{" "}
            <strong>{createdMetricName}</strong>. You can skip this and add a
            goal later from the dashboard.
          </p>
        </div>

        <div className="space-y-4 py-2">
          {createdMetricId && (
            <GoalEditor
              metricId={createdMetricId}
              initialGoal={null}
              startEditing={true}
              compact={true}
              onSave={handleFinish}
            />
          )}

          {createdMetricId && (
            <>
              <Separator />
              <RoleAssignment
                metricId={createdMetricId}
                metricName={createdMetricName}
                teamId={teamId}
                assignedRoleIds={[]}
              />
            </>
          )}
        </div>

        <div className="flex justify-between pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDialogStep("form")}
            className="gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleSkipGoal}>
              Skip
            </Button>
            <Button size="sm" onClick={handleFinish} className="gap-1.5">
              <Check className="h-4 w-4" />
              Done
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Step 1: Name */}
      {formStep === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold">name your metric</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              what would you like to track?
            </p>
          </div>
          <div className="space-y-2">
            <Input
              autoFocus
              placeholder="e.g. customer calls, revenue, team morale"
              value={metricName}
              onChange={(e) => setMetricName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canProceed()) handleNext();
              }}
              className="text-center"
            />
          </div>
        </div>
      )}

      {/* Step 2: Unit Type */}
      {formStep === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold">choose a unit</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              how is &ldquo;{metricName}&rdquo; measured?
            </p>
          </div>
          <div className="space-y-3">
            {UNIT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setUnitType(option.value)}
                className={cn(
                  "flex w-full items-start gap-4 rounded-lg border p-4 text-left transition-colors",
                  unitType === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-md",
                    unitType === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted",
                  )}
                >
                  {option.icon}
                </div>
                <div>
                  <div className="font-medium">{option.label}</div>
                  <div className="text-muted-foreground text-sm">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Cadence */}
      {formStep === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-xl font-semibold">select cadence</h3>
            <p className="text-muted-foreground mt-1 text-sm">
              at what time horizon do you want to look at the metric?
            </p>
          </div>
          <div className="space-y-3">
            {CADENCE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setCadence(option.value)}
                className={cn(
                  "flex w-full flex-col rounded-lg border p-4 text-left transition-colors",
                  cadence === option.value
                    ? "border-primary bg-primary/5"
                    : "hover:bg-muted/50",
                )}
              >
                <div className="font-medium">{option.label}</div>
                <div className="text-muted-foreground text-sm">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        {formStep > 1 ? (
          <button
            type="button"
            onClick={handleBack}
            className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            back
          </button>
        ) : (
          <div />
        )}

        <Button
          onClick={handleNext}
          disabled={!canProceed() || createMutation.isPending}
        >
          {createMutation.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : formStep === 3 ? (
            "create metric"
          ) : (
            "continue"
          )}
        </Button>
      </div>

      {createMutation.isError && (
        <p className="text-destructive text-center text-sm">
          {createMutation.error.message}
        </p>
      )}
    </div>
  );
}
