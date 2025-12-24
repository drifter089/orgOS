"use client";

import { useState } from "react";

import { ArrowLeft, Hash, Loader2, Percent } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { api } from "@/trpc/react";
import type { DashboardChartWithRelations } from "@/types/dashboard";

type UnitType = "number" | "percentage";
type Cadence = "daily" | "weekly" | "monthly";

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
  const [metricName, setMetricName] = useState("");
  const [unitType, setUnitType] = useState<UnitType | null>(null);
  const [cadence, setCadence] = useState<Cadence | null>(null);
  const [error, setError] = useState<string | null>(null);

  const utils = api.useUtils();

  const createMutation = api.manualMetric.create.useMutation({
    onSuccess: (result) => {
      const enrichedResult = {
        ...result,
        goalProgress: null,
        valueLabel: null,
        dataDescription: null,
        chartTransformer: null,
        metric: { ...result.metric, goal: null },
      } as DashboardChartWithRelations;

      utils.dashboard.getDashboardCharts.setData({ teamId }, (old) => {
        if (!old) return [enrichedResult];
        if (old.some((dc) => dc.id === result.id)) return old;
        return [...old, enrichedResult];
      });

      toast.success("KPI created", {
        description: "You can set a goal via the settings drawer.",
      });

      onClose?.();
      onSuccess?.();
    },
    onError: (err) => {
      setError(err.message);
      toast.error("Failed to create KPI");
    },
  });

  const handleSubmit = () => {
    if (!metricName.trim() || !unitType || !cadence) return;
    setError(null);

    createMutation.mutate({
      name: metricName.trim(),
      teamId,
      unitType,
      cadence,
      description: `${unitType} metric tracked ${cadence}`,
    });
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

      {error && <p className="text-destructive text-center text-sm">{error}</p>}
    </div>
  );
}
