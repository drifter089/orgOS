import { api } from "@/trpc/react";

interface UsePipelineProgressOptions {
  metricId: string;
  enabled?: boolean;
  pollInterval?: number;
}

export interface CompletedStep {
  step: string;
  displayName: string;
  status: "completed" | "failed";
  durationMs?: number;
}

export interface PipelineProgressState {
  isProcessing: boolean;
  currentStep: string | null;
  currentStepDisplayName: string | null;
  completedSteps: CompletedStep[];
  totalSteps: number;
  progressPercent: number;
  error: string | null;
}

// Map step names to display names (frontend version)
const STEP_DISPLAY_NAMES: Record<string, string> = {
  "fetching-api-data": "Fetching data...",
  "deleting-old-data": "Clearing old data...",
  "deleting-old-transformer": "Removing old transformer...",
  "generating-ingestion-transformer": "Generating transformer...",
  "executing-ingestion-transformer": "Processing data...",
  "saving-timeseries-data": "Saving data...",
  "generating-chart-transformer": "Generating chart...",
  "executing-chart-transformer": "Creating visualization...",
  "saving-chart-config": "Finalizing...",
};

// Estimated total steps for progress calculation
const SOFT_REFRESH_STEPS = 4;
const HARD_REFRESH_STEPS = 7;

export function usePipelineProgress({
  metricId,
  enabled = true,
  pollInterval = 500,
}: UsePipelineProgressOptions): PipelineProgressState {
  const { data } = api.pipeline.getProgress.useQuery(
    { metricId },
    {
      enabled,
      refetchInterval: enabled ? pollInterval : false,
    },
  );

  // Not processing or no data yet
  if (!data?.isProcessing) {
    return {
      isProcessing: false,
      currentStep: null,
      currentStepDisplayName: null,
      completedSteps: [],
      totalSteps: 0,
      progressPercent: 0,
      error: data?.error ?? null,
    };
  }

  const completedSteps = data.completedSteps ?? [];
  const currentStep = data.currentStep;

  // Determine if this is a hard refresh (starts with deleting-old-data)
  const isHardRefresh =
    completedSteps.some((s) => s.step === "deleting-old-data") ||
    currentStep === "deleting-old-data";

  const totalSteps = isHardRefresh ? HARD_REFRESH_STEPS : SOFT_REFRESH_STEPS;
  const completedCount = completedSteps.length;
  const progressPercent = Math.min(
    Math.round((completedCount / totalSteps) * 100),
    95, // Cap at 95% until done
  );

  return {
    isProcessing: true,
    currentStep,
    currentStepDisplayName: currentStep
      ? (STEP_DISPLAY_NAMES[currentStep] ?? currentStep)
      : null,
    completedSteps: completedSteps.map((step) => ({
      ...step,
      displayName:
        STEP_DISPLAY_NAMES[step.step] ?? step.displayName ?? step.step,
    })),
    totalSteps,
    progressPercent,
    error: null,
  };
}
